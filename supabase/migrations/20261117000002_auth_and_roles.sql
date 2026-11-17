-- Who is signed in, and what they may do.
-- Customers sign in with Google (or email). Staff are customers whose email
-- is listed, and switched on, in team_members.

create or replace function public.current_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members t
    where t.active
      and (t.user_id = auth.uid() or t.email = public.current_email())
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members t
    where t.active
      and t.role = 'Administrator'
      and (t.user_id = auth.uid() or t.email = public.current_email())
  )
$$;

-- Administrators may open every module, managers only the ones ticked for them
create or replace function public.staff_can(module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members t
    where t.active
      and (t.user_id = auth.uid() or t.email = public.current_email())
      and (t.role = 'Administrator' or module = any (t.modules))
  )
$$;

-- What the signed-in person is, for the app to read in one call
create or replace function public.my_staff_role()
returns table (role public.staff_role, modules text[], name text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.role, t.modules, t.name
  from public.team_members t
  where t.active
    and (t.user_id = auth.uid() or t.email = public.current_email())
  limit 1
$$;

-- New sign-ups get a profile, staff get linked, and orders they placed as a
-- guest with the same email move into their account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_email text := lower(coalesce(new.email, ''));
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    user_email
  )
  on conflict (id) do nothing;

  if user_email <> '' then
    update public.team_members set user_id = new.id where email = user_email and user_id is null;
    update public.orders set user_id = new.id where lower(customer_email) = user_email and user_id is null;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row level security ----------

alter table public.store_settings enable row level security;
alter table public.couriers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.coupons enable row level security;
alter table public.campaigns enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlists enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.shipments enable row level security;
alter table public.order_events enable row level security;
alter table public.reviews enable row level security;
alter table public.subscribers enable row level security;
alter table public.newsletter_drafts enable row level security;
alter table public.message_templates enable row level security;
alter table public.contact_messages enable row level security;
alter table public.team_members enable row level security;
alter table public.activity_log enable row level security;

-- Public storefront reads
create policy "settings are public" on public.store_settings for select using (true);
create policy "active couriers are public" on public.couriers for select using (active or public.is_staff());
create policy "categories are public" on public.categories for select using (true);
create policy "live products are public" on public.products for select using (active or public.is_staff());
create policy "variants of live products are public" on public.variants for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.active or public.is_staff()))
);
create policy "running campaigns are public" on public.campaigns for select using (active or public.is_staff());
create policy "approved reviews are public" on public.reviews for select using (
  status = 'Approved' or user_id = auth.uid() or public.is_staff()
);

-- Staff manage the shop. Module limits for managers are checked in the app.
create policy "staff edit settings" on public.store_settings for all using (public.staff_can('Settings')) with check (public.staff_can('Settings'));
create policy "staff edit couriers" on public.couriers for all using (public.staff_can('Settings')) with check (public.staff_can('Settings'));
create policy "staff edit categories" on public.categories for all using (public.staff_can('Categories')) with check (public.staff_can('Categories'));
create policy "staff edit products" on public.products for all using (public.staff_can('Products')) with check (public.staff_can('Products'));
create policy "staff edit variants" on public.variants for all using (public.staff_can('Products')) with check (public.staff_can('Products'));
-- Coupon codes are never listed to the public: checkout validates them with validate_coupon()
create policy "staff manage coupons" on public.coupons for all using (public.staff_can('Discounts')) with check (public.staff_can('Discounts'));
create policy "staff edit campaigns" on public.campaigns for all using (public.staff_can('Discounts')) with check (public.staff_can('Discounts'));
create policy "staff moderate reviews" on public.reviews for update using (public.staff_can('Reviews')) with check (public.staff_can('Reviews'));
create policy "staff delete reviews" on public.reviews for delete using (public.staff_can('Reviews'));
create policy "staff add reviews" on public.reviews for insert with check (public.staff_can('Reviews'));

-- Customers own their profile, addresses and wishlist
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "edit own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own addresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist" on public.wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Orders: customers read their own, staff read and update all.
-- Orders are only created through place_order() and admin_create_order().
create policy "read own or staff orders" on public.orders for select using (user_id = auth.uid() or public.staff_can('Orders') or public.staff_can('COD payments'));
create policy "staff update orders" on public.orders for update using (public.staff_can('Orders') or public.staff_can('COD payments')) with check (public.staff_can('Orders') or public.staff_can('COD payments'));
create policy "read own or staff lines" on public.order_lines for select using (
  exists (select 1 from public.orders o where o.number = order_number and (o.user_id = auth.uid() or public.is_staff()))
);
create policy "read own or staff shipments" on public.shipments for select using (
  exists (select 1 from public.orders o where o.number = order_number and (o.user_id = auth.uid() or public.is_staff()))
);
create policy "staff manage shipments" on public.shipments for all using (public.staff_can('Orders')) with check (public.staff_can('Orders'));
create policy "staff read events" on public.order_events for select using (public.is_staff());
create policy "staff add events" on public.order_events for insert with check (public.is_staff());

-- Marketing
create policy "staff manage subscribers" on public.subscribers for all using (public.staff_can('Newsletter')) with check (public.staff_can('Newsletter'));
create policy "staff manage drafts" on public.newsletter_drafts for all using (public.staff_can('Newsletter')) with check (public.staff_can('Newsletter'));
create policy "staff manage templates" on public.message_templates for all using (public.staff_can('Messages')) with check (public.staff_can('Messages'));
create policy "anyone can write to us" on public.contact_messages for insert with check (
  char_length(name) between 2 and 120 and char_length(contact) between 6 and 160 and char_length(message) between 10 and 5000 and not handled
);
create policy "staff read messages" on public.contact_messages for select using (public.staff_can('Messages'));
create policy "staff handle messages" on public.contact_messages for update using (public.staff_can('Messages')) with check (public.staff_can('Messages'));
create policy "staff delete messages" on public.contact_messages for delete using (public.staff_can('Messages'));

-- Team: everyone on the team can see it, only administrators change it
create policy "staff read team" on public.team_members for select using (public.is_staff());
create policy "admins manage team" on public.team_members for all using (public.is_admin()) with check (public.is_admin());

create policy "staff read activity" on public.activity_log for select using (public.is_staff());
create policy "staff add activity" on public.activity_log for insert with check (public.is_staff());
