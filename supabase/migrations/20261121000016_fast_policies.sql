-- Faster row level security. A policy such as `using (staff_can('Orders'))`
-- runs the function once for every row it checks. Wrapped as
-- `(select staff_can('Orders'))` Postgres runs it once per query and reuses
-- the answer (Supabase's recommended pattern). The rules themselves do not
-- change: only how often they are worked out.

do $$
declare
  p record;
  pattern constant text := '(?<!select )\m(public\.)?(staff_can\([^()]*\)|is_staff\(\)|is_admin\(\)|current_email\(\))|(?<!select )\mauth\.uid\(\)';
  wrapped_using text;
  wrapped_check text;
begin
  for p in
    select policyname, tablename, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    wrapped_using := regexp_replace(p.qual, pattern, '(select \&)', 'gi');
    wrapped_check := regexp_replace(p.with_check, pattern, '(select \&)', 'gi');
    if wrapped_using is distinct from p.qual then
      execute format('alter policy %I on public.%I using (%s)', p.policyname, p.tablename, wrapped_using);
    end if;
    if wrapped_check is distinct from p.with_check then
      execute format('alter policy %I on public.%I with check (%s)', p.policyname, p.tablename, wrapped_check);
    end if;
  end loop;
end;
$$;
