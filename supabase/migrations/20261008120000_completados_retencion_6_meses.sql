-- Limpieza360 — Trabajos completados: borrar a mano y retención de 6 meses.
-- NO APLICADA. Se aplica solo cuando Jonathan apruebe.
--
-- PLANTILLAS POR CASA (este archivo NUNCA las borra):
--   public.checklist           checklist base por casa (house, room, item). Se copia a
--                              cleaning_checklist cada vez que se asigna un trabajo en el calendario.
--   public.inventory_template  inventario base por casa. Se copiaba a assignment_inventory.
--   public.inventory           inventario vivo de la casa (solo se reinicia, nunca se borra).
--   (public.checklist_templates no existe en la base; el código cae a public.checklist.)
--
-- COPIAS POR TRABAJO (se borran junto con su trabajo):
--   public.cleaning_checklist    calendar_assignment_id text  = calendar_assignments.id::text
--   public.assignment_inventory  calendar_assignment_id uuid  (legado: calendar_assignments.id es
--                                bigint, así que ningún trabajo actual tiene filas aquí)
--   public.checklist_items       task_id uuid -> tasks(id) ON DELETE CASCADE (se borra solo)

-- 1) Borrar UN trabajo completado desde la app (botón Eliminar).
--    Solo Jonathan (dueño / casa 'all') o el manager de esa casa. Empleados no.
create or replace function public.delete_completed_job(p_kind text, p_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_house text;
  v_job_house text;
  v_allowed boolean;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;

  select lower(btrim(coalesce(p.role, ''))),
         lower(regexp_replace(btrim(coalesce(p.house, '')), '\s+', ' ', 'g'))
    into v_role, v_house
  from public.profiles p
  where p.id = auth.uid();

  if p_kind = 'calendar' then
    if coalesce(p_id, '') !~ '^\d+$' then
      raise exception 'Id de trabajo inválido' using errcode = '22023';
    end if;

    select ca.house into v_job_house
    from public.calendar_assignments ca
    where ca.id = p_id::bigint and ca.completed is true
    for update;
    if not found then
      return false;
    end if;
  elsif p_kind = 'extra' then
    if coalesce(p_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Id de tarea inválido' using errcode = '22023';
    end if;

    select t.house into v_job_house
    from public.tasks t
    where t.id = p_id::uuid and t.completed is true
    for update;
    if not found then
      return false;
    end if;
  else
    raise exception 'Tipo inválido: %', p_kind using errcode = '22023';
  end if;

  v_allowed := public.is_full_access()
    or (v_role = 'manager'
        and v_house <> ''
        and v_house = lower(regexp_replace(btrim(coalesce(v_job_house, '')), '\s+', ' ', 'g')));
  if not v_allowed then
    raise exception 'Solo Jonathan o el manager de la casa pueden eliminarlo' using errcode = '42501';
  end if;

  if p_kind = 'calendar' then
    delete from public.cleaning_checklist where calendar_assignment_id = p_id;
    delete from public.assignment_inventory where calendar_assignment_id::text = p_id;
    delete from public.calendar_assignments where id = p_id::bigint and completed is true;
  else
    -- checklist_items de esta tarea se borra por ON DELETE CASCADE.
    delete from public.tasks where id = p_id::uuid and completed is true;
  end if;

  return true;
end;
$$;

revoke all on function public.delete_completed_job(text, text) from public, anon;
grant execute on function public.delete_completed_job(text, text) to authenticated;

-- 2) Borrado automático: trabajos completados hace más de 6 meses.
create or replace function public.purge_completed_jobs(p_keep interval default interval '6 months')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cutoff timestamptz := now() - p_keep;
  v_ids bigint[];
  v_checklist integer := 0;
  v_inventory integer := 0;
  v_assignments integer := 0;
  v_tasks integer := 0;
begin
  if p_keep < interval '1 month' then
    raise exception 'Retención demasiado corta: %', p_keep;
  end if;

  select coalesce(array_agg(s.id), '{}'::bigint[]) into v_ids
  from (
    select ca.id
    from public.calendar_assignments ca
    where ca.completed is true
      and ca.completed_at is not null
      and ca.completed_at < v_cutoff
    for update
  ) s;

  if cardinality(v_ids) > 0 then
    delete from public.cleaning_checklist
    where calendar_assignment_id = any (array(select x::text from unnest(v_ids) x));
    get diagnostics v_checklist = row_count;

    delete from public.assignment_inventory
    where calendar_assignment_id::text = any (array(select x::text from unnest(v_ids) x));
    get diagnostics v_inventory = row_count;

    delete from public.calendar_assignments
    where id = any (v_ids) and completed is true;
    get diagnostics v_assignments = row_count;
  end if;

  -- checklist_items de estas tareas se borra por ON DELETE CASCADE.
  delete from public.tasks
  where completed is true
    and completed_at is not null
    and completed_at < v_cutoff;
  get diagnostics v_tasks = row_count;

  return jsonb_build_object(
    'cutoff', v_cutoff,
    'calendar_assignments', v_assignments,
    'cleaning_checklist', v_checklist,
    'assignment_inventory', v_inventory,
    'tasks', v_tasks
  );
end;
$$;

revoke all on function public.purge_completed_jobs(interval) from public, anon, authenticated;

-- 3) Todos los días 08:30 UTC (3:30 a. m. Colombia). Mismo nombre = reemplaza, no duplica.
select cron.schedule(
  'limpiar-completados-6-meses',
  '30 8 * * *',
  $cron$select public.purge_completed_jobs(interval '6 months')$cron$
);
