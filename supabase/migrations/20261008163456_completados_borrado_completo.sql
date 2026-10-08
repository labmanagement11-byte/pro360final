-- Limpieza360 — Trabajos completados: borrado completo e idempotente.
--
-- Qué cambia respecto a 20261008100114_completados_retencion_6_meses:
--  1) delete_completed_job: si el trabajo ya no existe responde true (ya está borrado) para que la
--     app lo quite de la lista en vez de mostrar un error. Sigue sin borrar trabajos activos
--     (completed distinto de true) y sigue pidiendo Jonathan o el manager de esa casa.
--  2) Borra el trabajo y TODAS sus copias por trabajo en la misma transacción:
--       calendario  -> cleaning_checklist (calendar_assignment_id = id::text)
--                      assignment_inventory (calendar_assignment_id::text = id; legado uuid)
--                      calendar_assignments
--       tarea extra -> checklist_items (task_id; también cae por ON DELETE CASCADE)
--                      tasks
--  3) purge_completed_jobs hace el mismo borrado y además barre copias huérfanas
--     (filas por trabajo cuyo trabajo ya no existe) de cleaning_checklist,
--     assignment_inventory y checklist_items.
--
-- NUNCA se tocan las plantillas de la casa: public.checklist, public.inventory_template,
-- public.inventory. Tampoco tarjetas de la casa, recordatorios ni avisos push.
--
-- Archivos: los trabajos no guardan fotos ni archivos en Storage. Los únicos buckets son
-- house-card-photos y house-card-videos, que pertenecen a las tarjetas de la casa, no a los
-- trabajos. Por eso borrar un trabajo no deja archivos y no hay nada que liberar en Storage.

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
  v_completed boolean;
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

    select ca.house, ca.completed into v_job_house, v_completed
    from public.calendar_assignments ca
    where ca.id = p_id::bigint
    for update;
  elsif p_kind = 'extra' then
    if coalesce(p_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Id de tarea inválido' using errcode = '22023';
    end if;

    select t.house, t.completed into v_job_house, v_completed
    from public.tasks t
    where t.id = p_id::uuid
    for update;
  else
    raise exception 'Tipo inválido: %', p_kind using errcode = '22023';
  end if;

  if not found then
    -- Ya no existe: quedó borrado (otro dispositivo, doble toque o la limpieza automática).
    return true;
  end if;

  if v_completed is not true then
    -- Trabajo activo: este botón solo borra completados.
    return false;
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
    delete from public.checklist_items where task_id = p_id::uuid;
    delete from public.tasks where id = p_id::uuid and completed is true;
  end if;

  return true;
end;
$$;

revoke all on function public.delete_completed_job(text, text) from public, anon;
grant execute on function public.delete_completed_job(text, text) to authenticated;

create or replace function public.purge_completed_jobs(p_keep interval default interval '6 months')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cutoff timestamptz := now() - p_keep;
  v_ids bigint[];
  v_task_ids uuid[];
  v_checklist integer := 0;
  v_inventory integer := 0;
  v_assignments integer := 0;
  v_items integer := 0;
  v_tasks integer := 0;
  v_orphan_checklist integer := 0;
  v_orphan_inventory integer := 0;
  v_orphan_items integer := 0;
begin
  if p_keep < interval '1 month' then
    raise exception 'Retención demasiado corta: %', p_keep;
  end if;

  -- 1) Trabajos del calendario completados hace más de p_keep.
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

  -- 2) Tareas extra completadas hace más de p_keep.
  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_task_ids
  from (
    select t.id
    from public.tasks t
    where t.completed is true
      and t.completed_at is not null
      and t.completed_at < v_cutoff
    for update
  ) s;

  if cardinality(v_task_ids) > 0 then
    delete from public.checklist_items where task_id = any (v_task_ids);
    get diagnostics v_items = row_count;

    delete from public.tasks where id = any (v_task_ids) and completed is true;
    get diagnostics v_tasks = row_count;
  end if;

  -- 3) Copias por trabajo cuyo trabajo ya no existe (borrados viejos o a medias).
  delete from public.cleaning_checklist cc
  where cc.calendar_assignment_id is not null
    and not exists (
      select 1 from public.calendar_assignments ca
      where ca.id::text = cc.calendar_assignment_id
    );
  get diagnostics v_orphan_checklist = row_count;

  delete from public.assignment_inventory ai
  where ai.calendar_assignment_id is not null
    and not exists (
      select 1 from public.calendar_assignments ca
      where ca.id::text = ai.calendar_assignment_id::text
    );
  get diagnostics v_orphan_inventory = row_count;

  delete from public.checklist_items ci
  where ci.task_id is not null
    and not exists (select 1 from public.tasks t where t.id = ci.task_id);
  get diagnostics v_orphan_items = row_count;

  return jsonb_build_object(
    'cutoff', v_cutoff,
    'calendar_assignments', v_assignments,
    'cleaning_checklist', v_checklist,
    'assignment_inventory', v_inventory,
    'tasks', v_tasks,
    'checklist_items', v_items,
    'orphan_cleaning_checklist', v_orphan_checklist,
    'orphan_assignment_inventory', v_orphan_inventory,
    'orphan_checklist_items', v_orphan_items,
    'storage_files', 0
  );
end;
$$;

revoke all on function public.purge_completed_jobs(interval) from public, anon, authenticated;
