-- Limpieza360 — Recordatorios: botón "Ya lo hice" (marcar hecho y reiniciar).
-- Aprobada por Jonathan y aplicada en Supabase (limpieza360final) el 8 oct 2026.
--
-- Estado actual de public.reminders (8 oct 2026):
--   due_date date NOT NULL, frequency text default 'once'
--   CHECK frequency IN ('once','monthly','yearly'), paid boolean, paid_date date.
--   No hay columna de "avisar N días antes": work-push usa 7 días fijos.
--
-- Cambios:
--   1) frequency acepta más opciones: weekly (semanal), quarterly (trimestral),
--      semiannual (semestral) y custom (cada N días, con interval_days).
--      'once', 'monthly' y 'yearly' siguen igual: ninguna fila existente cambia.
--   2) interval_days: días del intervalo cuando frequency = 'custom'. Si queda vacío se usa
--      la distancia original entre la creación y el vencimiento (mínimo 1 día).
--   3) last_done_at / last_done_by: quién y cuándo tocó "Ya lo hice" ("Hecho por X el fecha").
--   4) mark_reminder_done(p_id): solo Jonathan (dueño / casa 'all') o el manager de esa casa.
--      Recurrente: due_date = hoy (Colombia) + intervalo, paid = false (deja de estar vencido).
--      Única vez: paid = true (sale de los avisos).
--
-- Avisos: el trigger "aviso-recordatorio" (notify_work_push) y el pg_cron
-- work-push-recordatorios (sweep_work_push_reminders) leen due_date/paid de la fila actual,
-- así que el aviso sigue la fecha nueva y no vuelve a sonar por la fecha vieja.
-- Las columnas nuevas viajan por realtime (la publicación incluye todas las columnas).

alter table public.reminders
  add column if not exists interval_days integer,
  add column if not exists last_done_at timestamptz,
  add column if not exists last_done_by text;

alter table public.reminders drop constraint if exists reminders_frequency_check;
alter table public.reminders
  add constraint reminders_frequency_check
  check (frequency = any (array['once', 'weekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'custom']::text[]));

alter table public.reminders drop constraint if exists reminders_interval_days_check;
alter table public.reminders
  add constraint reminders_interval_days_check
  check (interval_days is null or interval_days between 1 and 3650);

comment on column public.reminders.interval_days is
  'Días entre repeticiones cuando frequency = custom. Vacío = distancia original creación→vencimiento.';
comment on column public.reminders.last_done_at is 'Última vez que se marcó "Ya lo hice".';
comment on column public.reminders.last_done_by is 'Usuario que marcó "Ya lo hice" la última vez.';

-- Próximo vencimiento a partir de una fecha (hoy) según la frecuencia. null = única vez.
create or replace function public.reminder_next_due(
  p_frequency text,
  p_interval_days integer,
  p_created_at timestamptz,
  p_due_date date,
  p_from date
)
returns date
language sql
immutable
set search_path = public, pg_temp
as $$
  select case coalesce(p_frequency, 'once')
    when 'weekly'     then p_from + 7
    when 'monthly'    then (p_from + interval '1 month')::date
    when 'quarterly'  then (p_from + interval '3 months')::date
    when 'semiannual' then (p_from + interval '6 months')::date
    when 'yearly'     then (p_from + interval '1 year')::date
    when 'custom'     then p_from + coalesce(
                             nullif(p_interval_days, 0),
                             greatest(1, p_due_date - coalesce((p_created_at at time zone 'America/Bogota')::date, p_due_date - 1))
                           )
    else null
  end;
$$;

create or replace function public.mark_reminder_done(p_id uuid)
returns public.reminders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_house text;
  v_who text;
  v_row public.reminders;
  v_today date := (now() at time zone 'America/Bogota')::date;
  v_next date;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;

  select lower(btrim(coalesce(p.role, ''))),
         lower(regexp_replace(btrim(coalesce(p.house, '')), '\s+', ' ', 'g')),
         coalesce(nullif(btrim(p.username), ''), 'Usuario')
    into v_role, v_house, v_who
  from public.profiles p
  where p.id = auth.uid();

  select * into v_row from public.reminders r where r.id = p_id for update;
  if not found then
    raise exception 'El recordatorio ya no existe' using errcode = 'P0002';
  end if;

  if not (
    public.is_full_access()
    or (v_role = 'manager'
        and v_house <> ''
        and v_house = lower(regexp_replace(btrim(coalesce(v_row.house, '')), '\s+', ' ', 'g')))
  ) then
    raise exception 'Solo Jonathan o el manager de la casa pueden marcarlo' using errcode = '42501';
  end if;

  v_next := public.reminder_next_due(v_row.frequency, v_row.interval_days, v_row.created_at, v_row.due_date, v_today);

  update public.reminders r
     set due_date     = coalesce(v_next, r.due_date),
         paid         = (v_next is null),
         paid_date    = v_today,
         last_done_at = now(),
         last_done_by = v_who,
         updated_at   = now()
   where r.id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.mark_reminder_done(uuid) from public, anon;
grant execute on function public.mark_reminder_done(uuid) to authenticated;
