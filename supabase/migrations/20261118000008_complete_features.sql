-- Everything else the spec asks for: COD reconciliation, stock history,
-- shipping by city, categories, website content, customer notes, review
-- photos and reports, abandoned carts, scheduled newsletters, WhatsApp,
-- invoice numbers, order editing and cancellation requests.

-- ---------- Settings ----------

alter table public.store_settings
  add column low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  add column review_request_days integer not null default 3 check (review_request_days between 1 and 60),
  add column abandoned_cart_hours integer not null default 24 check (abandoned_cart_hours between 1 and 168),
  add column invoice_prefix text not null default 'INV-',
  -- Turn automatic WhatsApp messages on once the WhatsApp Business API is connected
  add column whatsapp_enabled boolean not null default false;

-- ---------- Orders ----------

create sequence public.invoice_number_seq start with 1001;

alter table public.orders
  add column postal_code text,
  add column whatsapp_opt_in boolean not null default false,
  add column invoice_number bigint unique default nextval('public.invoice_number_seq'),
  -- Set once the stock of a cancelled or returned order is back on the shelf
  add column restocked boolean not null default false,
  add column cancel_request_reason text,
  add column cancel_requested_at timestamptz,
  -- COD reconciliation
  add column cod_collected integer check (cod_collected >= 0),
  add column cod_charges integer not null default 0 check (cod_charges >= 0),
  add column cod_reference text,
  add column cod_settled_at timestamptz,
  add column cod_notes text,
  -- Abandoned cart this order came from
  add column cart_id uuid;

-- Orders already restocked by the old trigger
update public.orders set restocked = true where status = 'Cancelled';

alter table public.shipments add column notes text;

-- Customer-facing order JSON gains the new fields
create or replace function public.order_json(o public.orders, with_internal boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'number', o.number,
    'placedAt', o.placed_at,
    'status', o.status,
    'invoiceNumber', o.invoice_number,
    'customer', jsonb_build_object(
      'name', o.customer_name,
      'phone', o.customer_phone,
      'email', o.customer_email,
      'city', o.city,
      'area', o.area,
      'address', o.address,
      'landmark', o.landmark,
      'postalCode', o.postal_code,
      'notes', o.customer_notes
    ),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', coalesce(l.product_id, ''),
        'variantId', l.variant_id,
        'name', l.name,
        'variant', l.variant_label,
        'qty', l.qty,
        'unitPrice', l.unit_price,
        'originalPrice', l.original_price
      ) order by l.id)
      from public.order_lines l where l.order_number = o.number
    ), '[]'::jsonb),
    'subtotal', o.subtotal,
    'couponCode', o.coupon_code,
    'couponDiscount', o.coupon_discount,
    'shipping', o.shipping,
    'total', o.total,
    'paymentMethod', o.payment_method,
    'paymentStatus', o.payment_status,
    'whatsappOptIn', o.whatsapp_opt_in,
    'cancelRequest', case when o.cancel_requested_at is not null then jsonb_build_object('at', o.cancel_requested_at, 'reason', o.cancel_request_reason) end,
    'shipment', (
      select jsonb_build_object(
        'courier', s.courier,
        'trackingId', s.tracking_id,
        'trackingUrl', s.tracking_url,
        'dispatchedAt', s.dispatched_at,
        'notes', s.notes
      )
      from public.shipments s where s.order_number = o.number
    ),
    'cancelReason', case when with_internal then o.cancel_reason end,
    'cod', case when with_internal then jsonb_build_object(
      'collected', o.cod_collected,
      'charges', o.cod_charges,
      'reference', o.cod_reference,
      'settledAt', o.cod_settled_at,
      'notes', o.cod_notes
    ) end,
    'history', case when with_internal then coalesce((
      select jsonb_agg(jsonb_build_object('at', e.at, 'text', e.text) order by e.at, e.id)
      from public.order_events e where e.order_number = o.number and e.kind = 'history'
    ), '[]'::jsonb) end,
    'notes', case when with_internal then coalesce((
      select jsonb_agg(jsonb_build_object('at', e.at, 'text', e.text) order by e.at, e.id)
      from public.order_events e where e.order_number = o.number and e.kind = 'note'
    ), '[]'::jsonb) end
  ))
$$;

-- ---------- Stock history ----------

create table public.stock_movements (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  variant_id text not null references public.variants (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  change integer not null,
  stock_after integer not null,
  reason text not null,
  order_number text references public.orders (number) on delete set null,
  actor uuid references auth.users (id) on delete set null
);
create index stock_movements_variant_idx on public.stock_movements (variant_id, at desc);
create index stock_movements_at_idx on public.stock_movements (at desc);
alter table public.stock_movements enable row level security;
create policy "staff read stock history" on public.stock_movements for select using (public.staff_can('Products'));

-- Every stock change is written down. Functions say why through
-- set_config('app.stock_reason') and set_config('app.stock_order').
create or replace function public.log_stock_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := new.stock - coalesce(case when tg_op = 'UPDATE' then old.stock end, 0);
begin
  if delta = 0 then return new; end if;
  insert into public.stock_movements (variant_id, product_id, change, stock_after, reason, order_number, actor)
  values (
    new.id,
    new.product_id,
    delta,
    new.stock,
    coalesce(nullif(current_setting('app.stock_reason', true), ''), case when tg_op = 'INSERT' then 'Starting stock' else 'Stock edited' end),
    nullif(current_setting('app.stock_order', true), ''),
    auth.uid()
  );
  return new;
end;
$$;

create trigger variants_log_stock after insert or update of stock on public.variants
  for each row execute function public.log_stock_change();

-- Set the stock of one size with a reason, from the dashboard
create or replace function public.adjust_stock(variant text, new_stock integer, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.staff_can('Products') then raise exception 'FORBIDDEN'; end if;
  if new_stock < 0 then raise exception 'INVALID: stock'; end if;
  perform set_config('app.stock_reason', coalesce(nullif(trim(reason), ''), 'Stock edited'), true);
  update public.variants set stock = new_stock where id = variant;
  perform set_config('app.stock_reason', '', true);
end;
$$;

grant execute on function public.adjust_stock(text, integer, text) to authenticated;

-- Cancelled and returned orders put their candles back, once
drop trigger if exists orders_restock on public.orders;

create or replace function public.restock_cancelled_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('Cancelled', 'Returned') and not old.restocked then
    perform set_config('app.stock_reason', case when new.status = 'Returned' then 'Order returned' else 'Order cancelled' end, true);
    perform set_config('app.stock_order', new.number, true);
    update public.variants va set stock = va.stock + l.qty
      from public.order_lines l where l.order_number = new.number and l.variant_id = va.id;
    update public.products p set sold = greatest(0, p.sold - s.qty)
      from (select product_id, sum(qty) as qty from public.order_lines where order_number = new.number group by 1) s
      where p.id = s.product_id;
    perform set_config('app.stock_reason', '', true);
    perform set_config('app.stock_order', '', true);
    new.restocked := true;
  end if;
  return new;
end;
$$;

create trigger orders_restock before update of status on public.orders
  for each row execute function public.restock_cancelled_order();

-- ---------- Shipping by city and area ----------

create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  -- Empty means the whole city
  area text not null default '',
  fee integer not null check (fee >= 0),
  -- Free delivery above this cart value in this place. Empty uses the store setting.
  free_over integer check (free_over >= 0),
  active boolean not null default true,
  unique (city, area)
);
alter table public.shipping_rates enable row level security;
create policy "active shipping rates are public" on public.shipping_rates for select using (active or public.is_staff());
create policy "staff edit shipping rates" on public.shipping_rates for all using (public.staff_can('Settings')) with check (public.staff_can('Settings'));

-- Delivery fee for a cart: area rule, then city rule, then the store default
create or replace function public.shipping_fee_for(city text, area text, cart_value integer)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rule public.shipping_rates;
  s public.store_settings;
  free_over integer;
begin
  select * into s from public.store_settings where id = 1;
  select * into rule from public.shipping_rates r
    where r.active and lower(r.city) = lower(trim(shipping_fee_for.city))
      and (r.area = '' or lower(r.area) = lower(trim(coalesce(shipping_fee_for.area, ''))))
    order by (r.area <> '') desc
    limit 1;
  free_over := coalesce(rule.free_over, s.free_shipping_over);
  if free_over > 0 and cart_value >= free_over then return 0; end if;
  return coalesce(rule.fee, s.shipping_fee, 0);
end;
$$;

-- ---------- Customers (team notes) ----------

create type public.customer_status as enum ('Active', 'VIP', 'Blocked');

create table public.customer_notes (
  phone text primary key check (phone ~ '^03[0-9]{9}$'),
  note text not null default '',
  status public.customer_status not null default 'Active',
  updated_at timestamptz not null default now()
);
alter table public.customer_notes enable row level security;
create policy "staff manage customer notes" on public.customer_notes for all using (public.staff_can('Customers')) with check (public.staff_can('Customers'));

-- ---------- Categories ----------

alter table public.categories
  add column parent_slug text references public.categories (slug) on delete set null on update cascade,
  add column image text,
  add column banner text,
  add column seo_title text,
  add column seo_description text,
  add column archived boolean not null default false,
  add constraint categories_not_own_parent check (parent_slug is null or parent_slug <> slug);

-- ---------- Website content ----------

-- Homepage slides, About, FAQ, policies, care guide, social links and SEO defaults
create table public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
create policy "site content is public" on public.site_content for select using (true);
create policy "staff edit site content" on public.site_content for all using (public.staff_can('Settings')) with check (public.staff_can('Settings'));
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

-- ---------- Reviews ----------

alter table public.reviews
  add column images text[] not null default '{}',
  add column reports integer not null default 0;

create table public.review_reports (
  id bigint generated always as identity primary key,
  review_id text not null references public.reviews (id) on delete cascade,
  reason text not null,
  at timestamptz not null default now()
);
alter table public.review_reports enable row level security;
create policy "staff read review reports" on public.review_reports for select using (public.staff_can('Reviews'));

-- Anyone can report a review. Three reports send it back for moderation.
create or replace function public.report_review(review text, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.throttle('report:' || review, 10, interval '1 day');
  insert into public.review_reports (review_id, reason) values (review, left(coalesce(nullif(trim(reason), ''), 'No reason given'), 300));
  update public.reviews r set reports = r.reports + 1,
    status = case when r.reports + 1 >= 3 and r.status = 'Approved' then 'Pending'::public.review_status else r.status end
  where r.id = review;
end;
$$;
grant execute on function public.report_review(text, text) to anon, authenticated;

drop function if exists public.submit_review(text, integer, text, text, text);

create or replace function public.submit_review(product text, rating integer, title text, body text, city text default '', images text[] default '{}')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  author text;
  bought boolean;
  new_id text;
begin
  if auth.uid() is null then raise exception 'SIGN_IN'; end if;
  if rating not between 1 and 5 then raise exception 'INVALID: rating'; end if;
  if char_length(trim(title)) < 3 or char_length(trim(body)) < 10 then raise exception 'INVALID: text'; end if;
  if cardinality(images) > 4 then raise exception 'INVALID: images'; end if;
  if exists (select 1 from public.reviews r where r.product_id = product and r.user_id = auth.uid()) then
    raise exception 'DUPLICATE';
  end if;

  select coalesce(nullif(split_part(p.name, ' ', 1), '') || coalesce(' ' || nullif(left(split_part(p.name, ' ', 2), 1), '') || '.', ''), 'Customer')
    into author from public.profiles p where p.id = auth.uid();

  select exists (
    select 1 from public.orders o join public.order_lines l on l.order_number = o.number
    where o.user_id = auth.uid() and o.status = 'Delivered' and l.product_id = product
  ) into bought;

  insert into public.reviews (product_id, user_id, author, city, rating, title, body, verified, images)
  values (product, auth.uid(), coalesce(author, 'Customer'), coalesce(trim(city), ''), rating, trim(title), trim(body), bought, images)
  returning id into new_id;
  return new_id;
end;
$$;
grant execute on function public.submit_review(text, integer, text, text, text, text[]) to authenticated;

-- Customers upload review photos into their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-images', 'review-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "review photos are public" on storage.objects for select using (bucket_id = 'review-images');
create policy "customers upload own review photos" on storage.objects for insert
  with check (bucket_id = 'review-images' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
create policy "staff delete review photos" on storage.objects for delete
  using (bucket_id = 'review-images' and public.staff_can('Reviews'));

-- ---------- Abandoned carts ----------

create table public.carts (
  id uuid primary key,
  email text,
  name text,
  phone text,
  items jsonb not null default '[]',
  subtotal integer not null default 0,
  updated_at timestamptz not null default now(),
  reminded_at timestamptz,
  recovered_order text references public.orders (number) on delete set null
);
create index carts_updated_idx on public.carts (updated_at);
alter table public.carts enable row level security;
create policy "staff read carts" on public.carts for select using (public.staff_can('Orders') or public.staff_can('Reports'));

-- Checkout saves the cart once an email is typed, so a reminder can follow
create or replace function public.save_cart(cart uuid, email text, name text, phone text, items jsonb, subtotal integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if email is null or email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then return; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 50 then return; end if;
  perform public.throttle('cart:' || cart, 30, interval '1 hour');
  insert into public.carts (id, email, name, phone, items, subtotal)
  values (cart, lower(trim(email)), nullif(trim(name), ''), nullif(trim(phone), ''), items, greatest(0, subtotal))
  on conflict on constraint carts_pkey do update
    set email = excluded.email, name = excluded.name, phone = excluded.phone, items = excluded.items,
        subtotal = excluded.subtotal, updated_at = now()
    where public.carts.recovered_order is null;
end;
$$;
grant execute on function public.save_cart(uuid, text, text, text, jsonb, integer) to anon, authenticated;

-- The reminder link brings the cart back on any device
create or replace function public.get_cart(cart uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select c.items from public.carts c where c.id = cart and c.recovered_order is null
$$;
grant execute on function public.get_cart(uuid) to anon, authenticated;

-- ---------- Newsletter scheduling ----------

alter table public.newsletter_drafts add column scheduled_for timestamptz;

-- ---------- WhatsApp ----------

alter table public.message_templates
  -- Name and language of the template approved in WhatsApp Manager
  add column wa_template text,
  add column wa_language text not null default 'en';

create table public.whatsapp_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  template_id text not null,
  to_phone text not null,
  body text not null default '',
  order_number text references public.orders (number) on delete set null,
  dedupe_key text,
  status public.email_status not null,
  error text,
  provider_id text
);
create index whatsapp_log_created_idx on public.whatsapp_log (created_at desc);
create unique index whatsapp_log_dedupe_idx on public.whatsapp_log (dedupe_key) where dedupe_key is not null and status = 'sent';
alter table public.whatsapp_log enable row level security;
create policy "staff read whatsapp log" on public.whatsapp_log for select using (public.staff_can('Messages'));

insert into public.message_templates (id, channel, audience, name, trigger, subject, body, active) values
  ('w-confirmed', 'whatsapp', 'Customer', 'Order confirmed', 'When you confirm an order', null,
   'Assalam o alaikum {{customer_name}}, your {{store_name}} order {{order_number}} is confirmed. Total to pay on delivery: {{order_total}}.', true),
  ('w-delivered', 'whatsapp', 'Customer', 'Order delivered', 'When you mark an order as delivered', null,
   'Assalam o alaikum {{customer_name}}, your order {{order_number}} has been delivered. Thank you for shopping with {{store_name}}.', false),
  ('w-cancel', 'whatsapp', 'Customer', 'Order cancelled', 'When an order is cancelled', null,
   'Assalam o alaikum {{customer_name}}, order {{order_number}} has been cancelled. Reply here if this was a mistake.', true),
  ('w-owner-cancel', 'whatsapp', 'Owner', 'Order cancelled alert', 'When an order is cancelled', null,
   'Order {{order_number}} from {{customer_name}} was cancelled. Stock has been put back.', true),
  ('w-owner-stock', 'whatsapp', 'Owner', 'Low stock alert', 'When a size runs low after an order', null,
   'Low stock: {{product_name}}, {{stock_left}} left.', true),
  ('e-cancel-request', 'email', 'Owner', 'Cancellation request', 'When a customer asks to cancel an order',
   'Cancellation request for {{order_number}}',
   E'{{customer_name}} asked to cancel order {{order_number}}.\n\nReason: {{message}}\n\nOpen the order to approve or refuse it.', true),
  ('e-cart', 'email', 'Customer', 'Cart reminder', 'When a cart is left at checkout',
   'You left something glowing',
   E'Assalam o alaikum {{customer_name}},\n\nYour candles are still waiting in your cart.\n\n{{order_details}}\n\nPress the button below to pick up where you left off. Cash on delivery, as always.', true)
on conflict (id) do nothing;

-- ---------- Checkout with postal code, city shipping, blocked customers ----------

create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cust jsonb := payload -> 'customer';
  item record;
  v record;
  coupon_check jsonb;
  coupon jsonb;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_shipping integer := 0;
  v_base integer;
  v_number text;
  v_token uuid;
  v_phone text := cust ->> 'phone';
  v_email text := nullif(lower(trim(cust ->> 'email')), '');
  v_cart uuid := nullif(payload ->> 'cartId', '')::uuid;
begin
  if coalesce(char_length(trim(cust ->> 'name')), 0) < 3 then raise exception 'INVALID: name'; end if;
  if v_phone is null or v_phone !~ '^03[0-9]{9}$' then raise exception 'INVALID: phone'; end if;
  if coalesce(char_length(trim(cust ->> 'address')), 0) < 8 then raise exception 'INVALID: address'; end if;
  if coalesce(trim(cust ->> 'city'), '') = '' then raise exception 'INVALID: city'; end if;
  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID: email'; end if;
  if jsonb_typeof(payload -> 'lines') <> 'array' or jsonb_array_length(payload -> 'lines') = 0 then
    raise exception 'INVALID: lines';
  end if;
  if exists (select 1 from public.customer_notes n where n.phone = v_phone and n.status = 'Blocked') then
    raise exception 'BLOCKED';
  end if;

  perform public.throttle('order:' || v_phone, 5, interval '1 hour');
  perform public.throttle('order:all', 300, interval '1 hour');

  drop table if exists pg_temp.cart_lines;
  create temporary table cart_lines on commit drop as
    select l ->> 'variantId' as variant_id, sum((l ->> 'qty')::integer)::integer as qty
    from jsonb_array_elements(payload -> 'lines') l
    group by 1;

  if exists (select 1 from cart_lines where qty is null or qty < 1 or qty > 100) then
    raise exception 'INVALID: quantity';
  end if;

  for item in select * from cart_lines order by variant_id loop
    select va.id, va.label, va.price, va.stock, p.name, p.active, public.effective_discount(p) as discount
      into v
      from public.variants va
      join public.products p on p.id = va.product_id
      where va.id = item.variant_id
      for update of va;
    if not found then raise exception 'UNAVAILABLE: %', item.variant_id; end if;
    if not v.active then raise exception 'UNAVAILABLE: %', v.name; end if;
    if v.stock < item.qty then raise exception 'OUT_OF_STOCK: % %', v.name, v.label; end if;
    v_subtotal := v_subtotal + public.sale_price(v.price, v.discount) * item.qty;
  end loop;

  if nullif(trim(payload ->> 'couponCode'), '') is not null then
    coupon_check := public.validate_coupon(payload ->> 'couponCode', v_subtotal, payload -> 'lines', v_phone, v_email);
    if not (coupon_check ->> 'ok')::boolean then
      raise exception 'COUPON: %', coupon_check ->> 'message';
    end if;
    coupon := coupon_check -> 'coupon';
    v_base := coalesce((coupon ->> 'eligibleSubtotal')::integer, v_subtotal);
    if coupon ->> 'type' = 'percent' then
      v_discount := round(v_base * (coupon ->> 'value')::integer / 100.0)::integer;
      if coupon ? 'maxDiscount' then v_discount := least(v_discount, (coupon ->> 'maxDiscount')::integer); end if;
    elsif coupon ->> 'type' = 'fixed' then
      v_discount := least((coupon ->> 'value')::integer, v_base);
    end if;
  end if;

  v_shipping := case
    when coupon ->> 'type' = 'free_shipping' then 0
    else public.shipping_fee_for(cust ->> 'city', cust ->> 'area', v_subtotal - v_discount)
  end;

  insert into public.orders (
    user_id, customer_name, customer_phone, customer_email, city, area, address, landmark, postal_code,
    customer_notes, subtotal, coupon_code, coupon_discount, shipping, total, whatsapp_opt_in, cart_id
  ) values (
    auth.uid(),
    trim(cust ->> 'name'),
    v_phone,
    v_email,
    trim(cust ->> 'city'),
    coalesce(trim(cust ->> 'area'), ''),
    trim(cust ->> 'address'),
    nullif(trim(cust ->> 'landmark'), ''),
    nullif(trim(cust ->> 'postalCode'), ''),
    nullif(trim(cust ->> 'notes'), ''),
    v_subtotal,
    coupon ->> 'code',
    v_discount,
    v_shipping,
    v_subtotal - v_discount + v_shipping,
    coalesce((payload ->> 'whatsappOptIn')::boolean, false),
    v_cart
  )
  returning number, access_token into v_number, v_token;

  insert into public.order_lines (order_number, product_id, variant_id, name, variant_label, qty, unit_price, original_price)
  select v_number, p.id, va.id, p.name, va.label, c.qty, public.sale_price(va.price, public.effective_discount(p)), va.price
  from cart_lines c
  join public.variants va on va.id = c.variant_id
  join public.products p on p.id = va.product_id;

  perform set_config('app.stock_reason', 'Order placed', true);
  perform set_config('app.stock_order', v_number, true);
  update public.variants va set stock = va.stock - c.qty from cart_lines c where va.id = c.variant_id;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order', '', true);
  update public.products p set sold = p.sold + s.qty
    from (select va.product_id, sum(c.qty) as qty from cart_lines c join public.variants va on va.id = c.variant_id group by 1) s
    where p.id = s.product_id;

  if coupon is not null then
    update public.coupons set used = used + 1 where code = coupon ->> 'code';
  end if;
  if v_cart is not null then
    update public.carts set recovered_order = v_number where id = v_cart;
  end if;
  -- Any saved cart for this email is no longer abandoned
  if v_email is not null then
    update public.carts set recovered_order = v_number where email = v_email and recovered_order is null;
  end if;

  insert into public.order_events (order_number, text) values (v_number, 'Order placed on the website');

  return jsonb_build_object('number', v_number, 'accessToken', v_token, 'total', v_subtotal - v_discount + v_shipping);
end;
$$;

-- Manual orders log their stock under the right reason
create or replace function public.admin_create_order(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cust jsonb := payload -> 'customer';
  v_number text;
  line jsonb;
begin
  if not public.staff_can('Orders') then raise exception 'FORBIDDEN'; end if;

  insert into public.orders (
    number, source, placed_at, status, customer_name, customer_phone, customer_email, city, area,
    address, landmark, postal_code, customer_notes, subtotal, coupon_code, coupon_discount, shipping, total
  ) values (
    coalesce(nullif(payload ->> 'number', ''), 'CND-' || nextval('public.order_number_seq')),
    'manual',
    coalesce((payload ->> 'placedAt')::timestamptz, now()),
    coalesce((payload ->> 'status')::public.order_status, 'Confirmed'),
    trim(cust ->> 'name'),
    cust ->> 'phone',
    nullif(lower(trim(cust ->> 'email')), ''),
    cust ->> 'city',
    coalesce(cust ->> 'area', ''),
    cust ->> 'address',
    nullif(cust ->> 'landmark', ''),
    nullif(cust ->> 'postalCode', ''),
    nullif(cust ->> 'notes', ''),
    (payload ->> 'subtotal')::integer,
    nullif(payload ->> 'couponCode', ''),
    coalesce((payload ->> 'couponDiscount')::integer, 0),
    coalesce((payload ->> 'shipping')::integer, 0),
    (payload ->> 'total')::integer
  )
  returning number into v_number;

  for line in select * from jsonb_array_elements(payload -> 'lines') loop
    insert into public.order_lines (order_number, product_id, variant_id, name, variant_label, qty, unit_price, original_price)
    values (
      v_number,
      nullif(line ->> 'productId', ''),
      coalesce(nullif(line ->> 'variantId', ''), (select va.id from public.variants va
        where va.product_id = line ->> 'productId' and va.label = line ->> 'variant' limit 1)),
      line ->> 'name',
      line ->> 'variant',
      (line ->> 'qty')::integer,
      (line ->> 'unitPrice')::integer,
      (line ->> 'originalPrice')::integer
    );
  end loop;

  perform set_config('app.stock_reason', 'Manual order', true);
  perform set_config('app.stock_order', v_number, true);
  update public.variants va set stock = greatest(0, va.stock - l.qty)
    from public.order_lines l where l.order_number = v_number and l.variant_id = va.id;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order', '', true);
  update public.products p set sold = p.sold + s.qty
    from (select product_id, sum(qty) as qty from public.order_lines where order_number = v_number group by 1) s
    where p.id = s.product_id;
  if payload ->> 'couponCode' is not null then
    update public.coupons set used = used + 1 where code = payload ->> 'couponCode';
  end if;

  insert into public.order_events (order_number, text, at, actor)
  select v_number, e ->> 'text', coalesce((e ->> 'at')::timestamptz, now()), auth.uid()
  from jsonb_array_elements(coalesce(payload -> 'history', '[]'::jsonb)) e;

  return v_number;
end;
$$;

-- Change the candles in an order after it was placed. Stock follows the change.
-- lines: [{ variantId, qty, unitPrice? }]. Totals are recomputed from the
-- prices given (or the current sale price), keeping the coupon discount amount.
create or replace function public.admin_edit_order(order_number text, lines jsonb, shipping integer, discount integer, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_subtotal integer;
begin
  if not public.staff_can('Orders') then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where number = admin_edit_order.order_number for update;
  if not found then raise exception 'INVALID: order'; end if;
  if o.status in ('Dispatched', 'Delivered', 'Cancelled', 'Returned', 'Failed Delivery') then
    raise exception 'INVALID: order already dispatched or closed';
  end if;
  if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) = 0 then raise exception 'INVALID: lines'; end if;

  -- Put the old quantities back, then take the new ones
  perform set_config('app.stock_order', o.number, true);
  perform set_config('app.stock_reason', 'Order edited', true);
  update public.variants va set stock = va.stock + l.qty
    from public.order_lines l where l.order_number = o.number and l.variant_id = va.id;
  delete from public.order_lines l where l.order_number = o.number;

  insert into public.order_lines (order_number, product_id, variant_id, name, variant_label, qty, unit_price, original_price)
  select o.number, p.id, va.id, p.name, va.label, (l ->> 'qty')::integer,
         coalesce((l ->> 'unitPrice')::integer, public.sale_price(va.price, public.effective_discount(p))), va.price
  from jsonb_array_elements(lines) l
  join public.variants va on va.id = l ->> 'variantId'
  join public.products p on p.id = va.product_id
  where (l ->> 'qty')::integer > 0;

  if exists (
    select 1 from public.order_lines l join public.variants va on va.id = l.variant_id
    where l.order_number = o.number and va.stock < l.qty
  ) then
    raise exception 'OUT_OF_STOCK: not enough stock for this change';
  end if;
  update public.variants va set stock = va.stock - l.qty
    from public.order_lines l where l.order_number = o.number and l.variant_id = va.id;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order', '', true);

  select coalesce(sum(unit_price * qty), 0) into v_subtotal from public.order_lines l where l.order_number = o.number;
  update public.orders set
    subtotal = v_subtotal,
    coupon_discount = least(greatest(0, admin_edit_order.discount), v_subtotal),
    shipping = greatest(0, admin_edit_order.shipping),
    total = v_subtotal - least(greatest(0, admin_edit_order.discount), v_subtotal) + greatest(0, admin_edit_order.shipping)
  where number = o.number;

  insert into public.order_events (order_number, text, actor)
  values (o.number, 'Order edited' || coalesce(': ' || nullif(trim(note), ''), ''), auth.uid());
end;
$$;
grant execute on function public.admin_edit_order(text, jsonb, integer, integer, text) to authenticated;

-- Customers ask to cancel from the confirmation or tracking page
create or replace function public.request_cancellation(order_number text, phone text, token uuid default null, reason text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  perform public.throttle('cancel:' || upper(trim(order_number)), 5, interval '1 hour');
  select * into o from public.orders
    where number = upper(trim(request_cancellation.order_number))
      and (customer_phone = request_cancellation.phone or access_token = token or (auth.uid() is not null and user_id = auth.uid()));
  if not found then raise exception 'INVALID: order'; end if;
  if o.status not in ('Pending Confirmation', 'Confirmed', 'Processing') then
    raise exception 'TOO_LATE';
  end if;
  update public.orders set
    status = 'Cancellation Requested',
    cancel_request_reason = left(coalesce(nullif(trim(reason), ''), 'No reason given'), 500),
    cancel_requested_at = now()
  where number = o.number;
  insert into public.order_events (order_number, text)
  values (o.number, 'Customer asked to cancel: ' || left(coalesce(nullif(trim(reason), ''), 'no reason given'), 200));
  return o.number;
end;
$$;
grant execute on function public.request_cancellation(text, text, uuid, text) to anon, authenticated;

-- Review requests wait the number of days set in Settings
-- (read by the daily job through the service role)
