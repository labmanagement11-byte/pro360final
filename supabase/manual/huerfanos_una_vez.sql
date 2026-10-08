-- Limpieza única de copias huérfanas (NO es migración, NO aplicada).
-- Huérfana = fila por trabajo cuyo trabajo ya no existe en calendar_assignments.
-- Nunca toca checklist, inventory_template ni inventory.

-- PASO 1: contar (solo SELECT)
select 'cleaning_checklist' as tabla,
       count(*) as filas,
       count(distinct cc.calendar_assignment_id) as trabajos
from public.cleaning_checklist cc
where not exists (
  select 1 from public.calendar_assignments ca
  where ca.id::text = cc.calendar_assignment_id
)
union all
select 'assignment_inventory',
       count(*),
       count(distinct ai.calendar_assignment_id)
from public.assignment_inventory ai
where not exists (
  select 1 from public.calendar_assignments ca
  where ca.id::text = ai.calendar_assignment_id::text
);

-- PASO 2: borrar (solo con aprobación de Jonathan). Filas con más de 1 día,
-- para no tocar una copia que se esté creando en ese momento.
-- begin;
-- delete from public.cleaning_checklist cc
-- where cc.created_at < now() - interval '1 day'
--   and not exists (select 1 from public.calendar_assignments ca where ca.id::text = cc.calendar_assignment_id);
-- delete from public.assignment_inventory ai
-- where ai.created_at < now() - interval '1 day'
--   and not exists (select 1 from public.calendar_assignments ca where ca.id::text = ai.calendar_assignment_id::text);
-- commit;
