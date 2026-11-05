-- =============================================================
-- 0010 · Realtime
-- Admin web refreshes on delivery changes; couriers get notification
-- rows live. Realtime postgres_changes respects RLS.
-- =============================================================

alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.notifications;
