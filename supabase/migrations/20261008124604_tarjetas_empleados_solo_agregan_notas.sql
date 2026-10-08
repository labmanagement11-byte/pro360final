-- Limpieza360 — Tarjetas por casa: los empleados SOLO agregan notas.
--
-- Antes: el empleado destino podía editar / borrar sus notas y los empleados de una tarjeta de
-- casa visible solo leían.
-- Ahora:
--   - Jonathan y el manager de la casa: crean, editan, borran y ordenan TODO (pasos y notas,
--     fotos, videos, enlaces). Solo Jonathan crea / renombra / borra tarjetas (sin cambio).
--   - Empleado destino de una tarjeta de empleado y empleados de la casa en una tarjeta de casa
--     visible: leen todo y AGREGAN notas (kind = 'nota', autor = ellos mismos) con fotos, videos
--     y enlaces. No editan ni borran nada, ni siquiera sus propias notas.
--   - Storage: esos empleados suben archivos a la carpeta de la tarjeta; no los cambian ni borran.

-- 1) Entradas -----------------------------------------------------------------------------

drop policy if exists hce_insert on public.house_card_entries;
drop policy if exists hce_update on public.house_card_entries;
drop policy if exists hce_delete on public.house_card_entries;

-- created_by lo pone el trigger (auth.uid()) antes de revisar la política.
create policy hce_insert on public.house_card_entries
  for insert to authenticated
  with check (
    public.can_access_house_cards(house)
    or (
      kind = 'nota'
      and created_by = auth.uid()
      and public.can_view_house_card_id(card_id)
    )
  );

create policy hce_update on public.house_card_entries
  for update to authenticated
  using (public.can_access_house_cards(house))
  with check (public.can_access_house_cards(house));

create policy hce_delete on public.house_card_entries
  for delete to authenticated
  using (public.can_access_house_cards(house));

-- 2) Archivos -----------------------------------------------------------------------------
--   'view'   : quien puede ver la tarjeta.
--   'upload' : quien puede ver la tarjeta (Jonathan, manager, empleado destino o empleados de
--              la casa si es visible): todos pueden agregar notas con fotos / videos.
--   'manage' : cambiar o borrar archivos: solo Jonathan y el manager.
-- p_owner se mantiene en la firma para no tocar las políticas existentes; ya no se usa.
create or replace function public.can_access_house_card_file(p_name text, p_mode text default 'view', p_owner text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_seg text := split_part(coalesce(p_name, ''), '/', 2);
  v_house text;
  v_target uuid;
  v_visible boolean;
begin
  if v_seg !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  select c.house, c.target_user_id, c.visible_to_employees into v_house, v_target, v_visible
  from public.house_custom_cards c where c.id = v_seg::uuid;
  if v_house is null then
    return false;
  end if;
  if public.can_access_house_cards(v_house) then
    return true;
  end if;
  if p_mode in ('view', 'upload') then
    return public.can_view_house_card(v_house, v_target, v_visible);
  end if;
  return false;
end;
$$;

revoke all on function public.can_access_house_card_file(text, text, text) from public, anon;
grant execute on function public.can_access_house_card_file(text, text, text) to authenticated;
