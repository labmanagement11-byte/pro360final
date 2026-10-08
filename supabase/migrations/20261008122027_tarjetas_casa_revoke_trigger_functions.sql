-- Las funciones de trigger de las tarjetas no deben poder llamarse por /rest/v1/rpc.
-- Los triggers siguen funcionando: PostgreSQL no revisa EXECUTE al disparar un trigger.
revoke all on function public.house_custom_cards_before_write() from public, anon, authenticated;
revoke all on function public.house_card_entries_before_write() from public, anon, authenticated;
revoke all on function public.house_custom_cards_sync_entries() from public, anon, authenticated;
