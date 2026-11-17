-- The dashboard updates by itself: Supabase Realtime tells it when these
-- tables change, and it reloads. Row level security still decides who hears
-- about which rows, so customers never receive other people's orders.

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array[
    'orders', 'order_events', 'shipments', 'contact_messages', 'reviews', 'subscribers',
    'products', 'variants', 'customer_notes', 'team_members'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
