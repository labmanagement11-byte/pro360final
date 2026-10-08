-- Limpieza360 — Tarjetas personalizadas por casa (ej. "Notas", "Instrucciones").
--
-- TIPOS DE TARJETA
--   De casa      (target_user_id IS NULL): para toda la casa.
--                visible_to_employees = true -> además TODOS los empleados de la casa la ven
--                (solo lectura).
--   De empleado  (target_user_id = profiles.id de un empleado de ESA casa): solo para él.
--
-- TIPOS DE ENTRADA (house_card_entries.kind)
--   'instruccion' : paso numerado (position), con título. Solo Jonathan y el manager los crean,
--                   editan, borran y reordenan. Para el empleado son de solo lectura.
--   'nota'        : nota libre (la más nueva arriba).
--   Cualquiera de las dos puede llevar texto, fotos, videos subidos y enlaces de video.
--
-- QUIÉN HACE QUÉ
--   Jonathan (dueño: role 'dueno'/'owner' o house 'all' => public.is_full_access()):
--     crea, renombra y elimina tarjetas (de casa o de empleado) en CUALQUIER casa, decide si una
--     tarjeta de casa es visible para los empleados; ve y maneja todas las entradas.
--   Manager de la casa (profiles.role = 'manager' y profiles.house = casa de la tarjeta):
--     ve TODAS las tarjetas de su casa y agrega / edita / borra / reordena cualquier entrada.
--     No crea, renombra ni borra tarjetas.
--   Empleado de la casa:
--     - tarjeta de casa visible para empleados: la ve completa, solo lectura.
--     - tarjeta hecha para él: la ve, agrega NOTAS (con fotos / videos / enlaces) y edita /
--       borra solo las suyas. Los pasos de instrucción son solo lectura.
--     - nunca ve tarjetas de casa no visibles ni tarjetas de otros empleados.
--     (Todo esto solo mientras siga en esa casa.)
--
-- El empleado se identifica por profiles.id (= auth.uid()), no por el nombre: así RLS es exacta
-- aunque el nombre se escriba distinto (username, email o parte antes de @, ver employeeScope.ts).
-- target_name guarda el username para mostrarlo.
--
-- La casa se referencia por NOMBRE (texto), igual que tasks.house, calendar_assignments.house,
-- inventory.house, shopping_list.house, etc. Se compara sin mayúsculas ni espacios dobles.
--
-- ARCHIVOS (privados, URLs firmadas). Ruta {casa-slug}/{card_id}/{uuid}.{ext}.
--   El permiso sale del card_id (2.º segmento de la ruta), no del slug de la casa.
--   'house-card-photos': máx. 5 MB, jpeg/png/webp. La app comprime (máx. 1600 px, JPEG 0.8).
--   'house-card-videos': máx. 50 MB (≈ 1 minuto), mp4/mov/webm. No se comprime en el teléfono;
--                        para videos largos la app recomienda un enlace de YouTube.
--   Ojo: el plan gratis de Supabase tiene 1 GB de Storage en total para TODO el proyecto.

-- 0) Utilidades -------------------------------------------------------------------------

create or replace function public.house_key(p_house text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select lower(regexp_replace(btrim(coalesce(p_house, '')), '\s+', ' ', 'g'));
$$;

-- Jonathan o el manager de esa casa.
create or replace function public.can_access_house_cards(p_house text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_full_access()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(btrim(coalesce(p.role, ''))) = 'manager'
        and public.house_key(p.house) <> ''
        and public.house_key(p.house) = public.house_key(p_house)
    );
$$;

revoke all on function public.can_access_house_cards(text) from public, anon;
grant execute on function public.can_access_house_cards(text) to authenticated;

-- Soy el empleado destino de la tarjeta y sigo perteneciendo a esa casa.
create or replace function public.is_house_card_target(p_house text, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_target is not null
    and p_target = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and public.house_key(p.house) <> ''
        and public.house_key(p.house) = public.house_key(p_house)
    );
$$;

revoke all on function public.is_house_card_target(text, uuid) from public, anon;
grant execute on function public.is_house_card_target(text, uuid) to authenticated;

-- Soy empleado de esa casa.
create or replace function public.is_house_employee(p_house text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(btrim(coalesce(p.role, ''))) = 'empleado'
      and public.house_key(p.house) <> ''
      and public.house_key(p.house) = public.house_key(p_house)
  );
$$;

revoke all on function public.is_house_employee(text) from public, anon;
grant execute on function public.is_house_employee(text) to authenticated;

-- Ver una tarjeta (y sus entradas): Jonathan, manager de la casa, el empleado destino o,
-- si es tarjeta de casa visible para empleados, cualquier empleado de la casa.
create or replace function public.can_view_house_card(p_house text, p_target uuid, p_visible boolean)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.can_access_house_cards(p_house)
      or public.is_house_card_target(p_house, p_target)
      or (p_target is null and coalesce(p_visible, false) and public.is_house_employee(p_house));
$$;

revoke all on function public.can_view_house_card(text, uuid, boolean) from public, anon;
grant execute on function public.can_view_house_card(text, uuid, boolean) to authenticated;

-- Enlaces: solo http(s), sin espacios, máx. 500 caracteres cada uno.
create or replace function public.house_card_links_ok(p_links text[])
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(bool_and(l ~* '^https?://[^[:space:]]+$' and char_length(l) <= 500), true)
  from unnest(coalesce(p_links, '{}'::text[])) as l;
$$;

-- 1) Tablas ------------------------------------------------------------------------------

create table if not exists public.house_custom_cards (
  id              uuid primary key default gen_random_uuid(),
  house           text not null,
  title           text not null,
  icon            text,
  position        integer not null default 0,
  -- NULL = tarjeta de toda la casa. Si se borra el perfil del empleado, la tarjeta queda
  -- como tarjeta de casa (solo Jonathan y el manager la ven) y conserva target_name.
  target_user_id  uuid references public.profiles(id) on delete set null,
  target_name     text,
  -- Solo tarjetas de casa: true = todos los empleados de la casa la ven (solo lectura).
  visible_to_employees boolean not null default false,
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint house_custom_cards_house_ok check (btrim(house) <> '' and lower(btrim(house)) <> 'all'),
  constraint house_custom_cards_title_ok check (char_length(btrim(title)) between 1 and 60),
  constraint house_custom_cards_icon_ok check (icon is null or char_length(icon) <= 16)
);

comment on table public.house_custom_cards is
  'Tarjetas creadas por Jonathan en el dashboard de UNA casa (ej. Notas), para toda la casa o para un empleado (target_user_id). Casa por nombre.';

create index if not exists house_custom_cards_house_idx
  on public.house_custom_cards (house, position, created_at);
create index if not exists house_custom_cards_target_idx
  on public.house_custom_cards (target_user_id) where target_user_id is not null;

-- Sin títulos repetidos para el mismo destino (la casa o el mismo empleado).
create unique index if not exists house_custom_cards_house_title_uidx
  on public.house_custom_cards (
    public.house_key(house),
    coalesce(target_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(title))
  );

create table if not exists public.house_card_entries (
  id              uuid primary key default gen_random_uuid(),
  card_id         uuid not null references public.house_custom_cards(id) on delete cascade,
  house           text not null,
  target_user_id  uuid,  -- copia de la tarjeta (para RLS y tiempo real); la pone el trigger
  kind            text not null default 'nota',
  title           text,
  position        integer not null default 0,  -- orden de los pasos (solo 'instruccion')
  body            text not null default '',
  photo_paths     text[] not null default '{}',
  video_paths     text[] not null default '{}',  -- archivos en el bucket house-card-videos
  video_links     text[] not null default '{}',  -- YouTube, Vimeo, Drive… (http/https)
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint house_card_entries_kind_ok check (kind in ('nota', 'instruccion')),
  constraint house_card_entries_title_len check (title is null or char_length(title) <= 120),
  constraint house_card_entries_step_title check (kind <> 'instruccion' or btrim(coalesce(title, '')) <> ''),
  constraint house_card_entries_body_len check (char_length(body) <= 5000),
  constraint house_card_entries_photos_max check (cardinality(photo_paths) <= 10),
  constraint house_card_entries_videos_max check (cardinality(video_paths) <= 3),
  constraint house_card_entries_links_max check (cardinality(video_links) <= 5),
  constraint house_card_entries_links_ok check (public.house_card_links_ok(video_links)),
  constraint house_card_entries_not_empty check (
    btrim(body) <> '' or btrim(coalesce(title, '')) <> ''
    or cardinality(photo_paths) > 0 or cardinality(video_paths) > 0 or cardinality(video_links) > 0
  )
);

comment on table public.house_card_entries is
  'Entradas de una tarjeta: pasos de instrucción ordenados (kind=instruccion) o notas (kind=nota), con texto, fotos, videos y enlaces. house y target_user_id se copian de la tarjeta.';

create index if not exists house_card_entries_card_idx
  on public.house_card_entries (card_id, created_at desc);
create index if not exists house_card_entries_steps_idx
  on public.house_card_entries (card_id, position) where kind = 'instruccion';
create index if not exists house_card_entries_house_idx
  on public.house_card_entries (house);
create index if not exists house_card_entries_target_idx
  on public.house_card_entries (target_user_id) where target_user_id is not null;

-- 2) Triggers: autor, fechas y casa no se pueden falsificar desde el cliente -------------

create or replace function public.house_custom_cards_before_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  new.title := btrim(new.title);
  new.icon := nullif(btrim(coalesce(new.icon, '')), '');
  if tg_op = 'INSERT' then
    new.house := btrim(new.house);
    if new.target_user_id is null then
      new.target_name := null;
    else
      new.visible_to_employees := false;  -- la de empleado solo la ve ese empleado
      -- Solo un EMPLEADO de esa misma casa.
      select p.username into v_name
      from public.profiles p
      where p.id = new.target_user_id
        and lower(btrim(coalesce(p.role, ''))) = 'empleado'
        and public.house_key(p.house) = public.house_key(new.house);
      if not found then
        raise exception 'El empleado no pertenece a esta casa' using errcode = '23514';
      end if;
      new.target_name := v_name;
    end if;
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_by_name := coalesce(
      (select p.username from public.profiles p where p.id = auth.uid()),
      new.created_by_name
    );
    new.created_at := now();
  else
    -- La casa, el destino, el autor y la fecha de creación no cambian.
    -- (target_user_id sí puede pasar a NULL por ON DELETE SET NULL del perfil.)
    new.house := old.house;
    if new.target_user_id is not null then
      new.target_user_id := old.target_user_id;
    end if;
    new.target_name := old.target_name;
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists house_custom_cards_before_write on public.house_custom_cards;
create trigger house_custom_cards_before_write
  before insert or update on public.house_custom_cards
  for each row execute function public.house_custom_cards_before_write();

create or replace function public.house_card_entries_before_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_house text;
  v_target uuid;
begin
  if tg_op = 'UPDATE' then
    new.card_id := old.card_id;
    new.kind := old.kind;  -- una nota no se vuelve paso (ni al revés)
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_by_name := coalesce(
      (select p.username from public.profiles p where p.id = auth.uid()),
      new.created_by_name
    );
    new.created_at := now();
  end if;

  select c.house, c.target_user_id into v_house, v_target
  from public.house_custom_cards c where c.id = new.card_id;
  if v_house is null then
    raise exception 'La tarjeta no existe' using errcode = '23503';
  end if;
  new.house := v_house;
  new.target_user_id := v_target;
  new.title := nullif(btrim(coalesce(new.title, '')), '');
  new.photo_paths := coalesce(new.photo_paths, '{}');
  new.video_paths := coalesce(new.video_paths, '{}');
  new.video_links := coalesce(new.video_links, '{}');
  if tg_op = 'INSERT' then
    if new.kind = 'instruccion' then
      -- Paso nuevo: al final.
      select coalesce(max(e.position), 0) + 1 into new.position
      from public.house_card_entries e
      where e.card_id = new.card_id and e.kind = 'instruccion';
    else
      new.position := 0;
    end if;
  elsif new.kind <> 'instruccion' then
    new.position := 0;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists house_card_entries_before_write on public.house_card_entries;
create trigger house_card_entries_before_write
  before insert or update on public.house_card_entries
  for each row execute function public.house_card_entries_before_write();

-- Si la tarjeta pierde su empleado (perfil borrado), sus notas pasan a ser de casa.
create or replace function public.house_custom_cards_sync_entries()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.target_user_id is distinct from old.target_user_id then
    update public.house_card_entries e
       set target_user_id = new.target_user_id
     where e.card_id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists house_custom_cards_sync_entries on public.house_custom_cards;
create trigger house_custom_cards_sync_entries
  after update of target_user_id on public.house_custom_cards
  for each row execute function public.house_custom_cards_sync_entries();

-- Ver las entradas de una tarjeta = poder ver la tarjeta (incluye visible_to_employees).
create or replace function public.can_view_house_card_id(p_card uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.house_custom_cards c
    where c.id = p_card
      and public.can_view_house_card(c.house, c.target_user_id, c.visible_to_employees)
  );
$$;

revoke all on function public.can_view_house_card_id(uuid) from public, anon;
grant execute on function public.can_view_house_card_id(uuid) to authenticated;

-- 3) RLS ---------------------------------------------------------------------------------

alter table public.house_custom_cards enable row level security;
alter table public.house_card_entries enable row level security;

revoke all on public.house_custom_cards from anon;
revoke all on public.house_card_entries from anon;
grant select, insert, update, delete on public.house_custom_cards to authenticated;
grant select, insert, update, delete on public.house_card_entries to authenticated;

drop policy if exists hcc_select on public.house_custom_cards;
drop policy if exists hcc_insert_owner on public.house_custom_cards;
drop policy if exists hcc_update_owner on public.house_custom_cards;
drop policy if exists hcc_delete_owner on public.house_custom_cards;

create policy hcc_select on public.house_custom_cards
  for select to authenticated
  using (public.can_view_house_card(house, target_user_id, visible_to_employees));

create policy hcc_insert_owner on public.house_custom_cards
  for insert to authenticated
  with check (public.is_full_access());

create policy hcc_update_owner on public.house_custom_cards
  for update to authenticated
  using (public.is_full_access())
  with check (public.is_full_access());

create policy hcc_delete_owner on public.house_custom_cards
  for delete to authenticated
  using (public.is_full_access());

drop policy if exists hce_select on public.house_card_entries;
drop policy if exists hce_insert on public.house_card_entries;
drop policy if exists hce_update on public.house_card_entries;
drop policy if exists hce_delete on public.house_card_entries;

-- Jonathan y el manager: todo (pasos y notas). Empleado destino: ve todo en su tarjeta,
-- agrega NOTAS y edita / borra solo las suyas; los pasos son solo lectura.
-- Empleados con tarjeta de casa visible: solo lectura.
create policy hce_select on public.house_card_entries
  for select to authenticated
  using (public.can_view_house_card_id(card_id));

create policy hce_insert on public.house_card_entries
  for insert to authenticated
  with check (
    public.can_access_house_cards(house)
    or (kind = 'nota' and public.is_house_card_target(house, target_user_id))
  );

create policy hce_update on public.house_card_entries
  for update to authenticated
  using (
    public.can_access_house_cards(house)
    or (kind = 'nota' and public.is_house_card_target(house, target_user_id) and created_by = auth.uid())
  )
  with check (
    public.can_access_house_cards(house)
    or (kind = 'nota' and public.is_house_card_target(house, target_user_id) and created_by = auth.uid())
  );

create policy hce_delete on public.house_card_entries
  for delete to authenticated
  using (
    public.can_access_house_cards(house)
    or (kind = 'nota' and public.is_house_card_target(house, target_user_id) and created_by = auth.uid())
  );

-- Subir / bajar un paso (botones ↑ ↓). Renumera 1..n y cambia de lugar con el vecino.
-- SECURITY INVOKER: las políticas de UPDATE de arriba siguen mandando.
create or replace function public.move_house_card_step(p_entry uuid, p_direction integer)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_card uuid;
  v_house text;
  v_ids uuid[];
  v_idx integer;
  v_swap integer;
  v_tmp uuid;
begin
  select e.card_id, e.house into v_card, v_house
  from public.house_card_entries e
  where e.id = p_entry and e.kind = 'instruccion';
  if v_card is null then
    return false;
  end if;
  if not public.can_access_house_cards(v_house) then
    raise exception 'Solo Jonathan o el manager pueden ordenar los pasos' using errcode = '42501';
  end if;

  select array_agg(e.id order by e.position, e.created_at, e.id) into v_ids
  from public.house_card_entries e
  where e.card_id = v_card and e.kind = 'instruccion';

  v_idx := array_position(v_ids, p_entry);
  v_swap := v_idx + case when p_direction < 0 then -1 else 1 end;
  if v_swap < 1 or v_swap > cardinality(v_ids) then
    return false;
  end if;
  v_tmp := v_ids[v_idx];
  v_ids[v_idx] := v_ids[v_swap];
  v_ids[v_swap] := v_tmp;

  update public.house_card_entries e
     set position = x.ord
    from unnest(v_ids) with ordinality as x(id, ord)
   where e.id = x.id and e.position is distinct from x.ord::integer;
  return true;
end;
$$;

revoke all on function public.move_house_card_step(uuid, integer) from public, anon;
grant execute on function public.move_house_card_step(uuid, integer) to authenticated;

-- 4) Realtime ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'house_custom_cards'
  ) then
    alter publication supabase_realtime add table public.house_custom_cards;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'house_card_entries'
  ) then
    alter publication supabase_realtime add table public.house_card_entries;
  end if;
end;
$$;

-- 5) Storage: buckets privados + políticas ---------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('house-card-photos', 'house-card-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 50 MB = límite por archivo del plan gratis. ≈ 1 minuto de video del teléfono.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('house-card-videos', 'house-card-videos', false, 52428800,
        array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Ruta {casa-slug}/{card_id}/{archivo}. El permiso sale de la tarjeta del 2.º segmento.
--   'view'   (ver)      : quien puede ver la tarjeta (incluye empleados si es visible).
--   'upload' (subir)    : Jonathan, el manager o el empleado destino de la tarjeta.
--   'manage' (borrar)   : Jonathan y el manager; el empleado destino solo lo que él subió
--                         (storage.objects.owner_id = auth.uid()).
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
  if p_mode = 'view' then
    return public.can_view_house_card(v_house, v_target, v_visible);
  end if;
  if not public.is_house_card_target(v_house, v_target) then
    return false;
  end if;
  if p_mode = 'upload' then
    return true;
  end if;
  return p_owner is not null and p_owner = auth.uid()::text;
end;
$$;

revoke all on function public.can_access_house_card_file(text, text, text) from public, anon;
grant execute on function public.can_access_house_card_file(text, text, text) to authenticated;

drop policy if exists house_card_files_select on storage.objects;
drop policy if exists house_card_files_insert on storage.objects;
drop policy if exists house_card_files_update on storage.objects;
drop policy if exists house_card_files_delete on storage.objects;

create policy house_card_files_select on storage.objects
  for select to authenticated
  using (bucket_id in ('house-card-photos', 'house-card-videos')
         and public.can_access_house_card_file(name, 'view'));

create policy house_card_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('house-card-photos', 'house-card-videos')
              and public.can_access_house_card_file(name, 'upload'));

create policy house_card_files_update on storage.objects
  for update to authenticated
  using (bucket_id in ('house-card-photos', 'house-card-videos')
         and public.can_access_house_card_file(name, 'manage', owner_id))
  with check (bucket_id in ('house-card-photos', 'house-card-videos')
              and public.can_access_house_card_file(name, 'manage', owner_id));

create policy house_card_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('house-card-photos', 'house-card-videos')
         and public.can_access_house_card_file(name, 'manage', owner_id));
