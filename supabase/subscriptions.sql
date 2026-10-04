-- NO APLICADO. Esperando revisión. La función work-push y el cliente
-- leen public.subscriptions, pero esta tabla todavía no existe.

create table if not exists public.subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  primary key (endpoint)
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "subscriptions_insert_own"
  on public.subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "subscriptions_update_own"
  on public.subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "subscriptions_delete_own"
  on public.subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
