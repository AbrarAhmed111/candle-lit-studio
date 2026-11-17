-- Launch rules: coupon restrictions, running campaigns in checkout prices,
-- and throttling on the public entry points.

-- ---------- Throttling ----------

-- Recent hits per key. Only the functions below read or write it.
create table public.throttle_hits (
  key text not null,
  at timestamptz not null default now()
);
create index throttle_hits_key_at_idx on public.throttle_hits (key, at desc);
alter table public.throttle_hits enable row level security;

-- Raises RATE_LIMIT when `key` was hit `max_hits` times inside `span`
create or replace function public.throttle(key text, max_hits integer, span interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Keep the table small: drop anything older than a day
  delete from public.throttle_hits h where h.at < now() - interval '1 day';
  if (select count(*) from public.throttle_hits h where h.key = throttle.key and h.at > now() - span) >= max_hits then
    raise exception 'RATE_LIMIT';
  end if;
  insert into public.throttle_hits (key) values (throttle.key);
end;
$$;

revoke execute on function public.throttle(text, integer, interval) from public, anon, authenticated;

-- Contact form: 3 messages an hour per sender, 60 an hour in total
create or replace function public.throttle_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.throttle('contact:' || lower(trim(new.contact)), 3, interval '1 hour');
  perform public.throttle('contact:all', 60, interval '1 hour');
  return new;
end;
$$;

create trigger contact_messages_throttle before insert on public.contact_messages
  for each row execute function public.throttle_contact();

-- ---------- Campaign prices ----------

-- The discount a product sells at today: its own discount or the best running
-- campaign that covers it, whichever is larger. They never stack.
create or replace function public.effective_discount(product public.products)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(greatest(
    coalesce(product.discount_percent, 0),
    coalesce((
      select max(c.discount_percent)
      from public.campaigns c
      where c.active
        and (now() at time zone 'Asia/Karachi')::date between c.starts_at and c.ends_at
        and (cardinality(c.categories) = 0 or c.categories && product.categories)
    ), 0)
  ), 0)
$$;

create or replace function public.sale_price(price integer, discount integer)
returns integer
language sql
immutable
as $$
  select case when discount is null then price else round(price * (1 - discount / 100.0))::integer end
$$;

-- ---------- Coupon rules ----------

alter table public.coupons
  add column first_order_only boolean not null default false,
  add column per_customer_limit integer check (per_customer_limit > 0),
  -- Empty means every product
  add column product_ids text[] not null default '{}',
  add column category_slugs text[] not null default '{}';

update public.coupons set first_order_only = true, per_customer_limit = 1 where code = 'WELCOME10';

drop function if exists public.validate_coupon(text, integer);

-- Checks a code against the cart and, when known, the customer.
-- lines: [{ variantId, qty }]. Without a phone or email the customer rules
-- wait for checkout, where place_order() checks them again.
create or replace function public.validate_coupon(
  code text,
  subtotal integer,
  lines jsonb default null,
  phone text default null,
  email text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.coupons;
  eligible integer := subtotal;
  restricted boolean;
  prior integer;
  used_by_customer integer;
  customer_known boolean := nullif(phone, '') is not null or nullif(email, '') is not null or auth.uid() is not null;
begin
  select * into c from public.coupons where coupons.code = upper(trim(validate_coupon.code));
  if not found or not c.active then
    return jsonb_build_object('ok', false, 'message', 'That code does not exist. Check the spelling and try again.');
  end if;
  if c.expires_at is not null and c.expires_at < (now() at time zone 'Asia/Karachi')::date then
    return jsonb_build_object('ok', false, 'message', c.code || ' has expired.');
  end if;
  if c.max_uses is not null and c.used >= c.max_uses then
    return jsonb_build_object('ok', false, 'message', c.code || ' has been fully used.');
  end if;
  if c.min_cart is not null and subtotal < c.min_cart then
    return jsonb_build_object(
      'ok', false,
      'message', c.code || ' needs a cart of Rs. ' || to_char(c.min_cart, 'FM999,999,999') || ' or more.'
    );
  end if;

  restricted := cardinality(c.product_ids) > 0 or cardinality(c.category_slugs) > 0;
  if restricted and lines is not null then
    select coalesce(sum(public.sale_price(va.price, public.effective_discount(p)) * (l ->> 'qty')::integer), 0)
      into eligible
      from jsonb_array_elements(lines) l
      join public.variants va on va.id = l ->> 'variantId'
      join public.products p on p.id = va.product_id
      where p.id = any (c.product_ids) or p.categories && c.category_slugs;
    if eligible = 0 then
      return jsonb_build_object('ok', false, 'message', c.code || ' does not apply to the candles in your cart.');
    end if;
  end if;

  if customer_known and (c.first_order_only or c.per_customer_limit is not null) then
    select count(*), count(*) filter (where o.coupon_code = c.code)
      into prior, used_by_customer
      from public.orders o
      where o.status <> 'Cancelled'
        and (
          (nullif(phone, '') is not null and o.customer_phone = phone)
          or (nullif(email, '') is not null and lower(o.customer_email) = lower(email))
          or (auth.uid() is not null and o.user_id = auth.uid())
        );
    if c.first_order_only and prior > 0 then
      return jsonb_build_object('ok', false, 'message', c.code || ' is for first orders only.');
    end if;
    if c.per_customer_limit is not null and used_by_customer >= c.per_customer_limit then
      return jsonb_build_object('ok', false, 'message', 'You have already used ' || c.code || '.');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'coupon', jsonb_strip_nulls(jsonb_build_object(
    'code', c.code,
    'type', c.type,
    'value', c.value,
    'minCart', c.min_cart,
    'maxDiscount', c.max_discount,
    'expiresAt', c.expires_at,
    'description', c.description,
    'firstOrderOnly', c.first_order_only,
    'productIds', case when cardinality(c.product_ids) > 0 then to_jsonb(c.product_ids) end,
    'categories', case when cardinality(c.category_slugs) > 0 then to_jsonb(c.category_slugs) end,
    'eligibleSubtotal', eligible
  )));
end;
$$;

grant execute on function public.validate_coupon(text, integer, jsonb, text, text) to anon, authenticated;

-- ---------- Checkout with campaigns, coupon rules and throttling ----------

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
  settings public.store_settings;
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
begin
  if coalesce(char_length(trim(cust ->> 'name')), 0) < 3 then raise exception 'INVALID: name'; end if;
  if v_phone is null or v_phone !~ '^03[0-9]{9}$' then raise exception 'INVALID: phone'; end if;
  if coalesce(char_length(trim(cust ->> 'address')), 0) < 8 then raise exception 'INVALID: address'; end if;
  if coalesce(trim(cust ->> 'city'), '') = '' then raise exception 'INVALID: city'; end if;
  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID: email'; end if;
  if jsonb_typeof(payload -> 'lines') <> 'array' or jsonb_array_length(payload -> 'lines') = 0 then
    raise exception 'INVALID: lines';
  end if;

  -- 5 orders an hour per phone, 300 an hour for the whole store
  perform public.throttle('order:' || v_phone, 5, interval '1 hour');
  perform public.throttle('order:all', 300, interval '1 hour');

  select * into settings from public.store_settings where id = 1;

  -- Same size twice in the cart counts as one line
  drop table if exists pg_temp.cart_lines;
  create temporary table cart_lines on commit drop as
    select l ->> 'variantId' as variant_id, sum((l ->> 'qty')::integer)::integer as qty
    from jsonb_array_elements(payload -> 'lines') l
    group by 1;

  if exists (select 1 from cart_lines where qty is null or qty < 1 or qty > 100) then
    raise exception 'INVALID: quantity';
  end if;

  -- Lock the sizes so two customers cannot buy the last candle twice
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
    -- Restricted coupons only discount the candles they cover
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
    when settings.free_shipping_over > 0 and v_subtotal - v_discount >= settings.free_shipping_over then 0
    else coalesce(settings.shipping_fee, 0)
  end;

  insert into public.orders (
    user_id, customer_name, customer_phone, customer_email, city, area, address, landmark,
    customer_notes, subtotal, coupon_code, coupon_discount, shipping, total
  ) values (
    auth.uid(),
    trim(cust ->> 'name'),
    v_phone,
    v_email,
    trim(cust ->> 'city'),
    coalesce(trim(cust ->> 'area'), ''),
    trim(cust ->> 'address'),
    nullif(trim(cust ->> 'landmark'), ''),
    nullif(trim(cust ->> 'notes'), ''),
    v_subtotal,
    coupon ->> 'code',
    v_discount,
    v_shipping,
    v_subtotal - v_discount + v_shipping
  )
  returning number, access_token into v_number, v_token;

  insert into public.order_lines (order_number, product_id, variant_id, name, variant_label, qty, unit_price, original_price)
  select v_number, p.id, va.id, p.name, va.label, c.qty, public.sale_price(va.price, public.effective_discount(p)), va.price
  from cart_lines c
  join public.variants va on va.id = c.variant_id
  join public.products p on p.id = va.product_id;

  update public.variants va set stock = va.stock - c.qty from cart_lines c where va.id = c.variant_id;
  update public.products p set sold = p.sold + s.qty
    from (select va.product_id, sum(c.qty) as qty from cart_lines c join public.variants va on va.id = c.variant_id group by 1) s
    where p.id = s.product_id;

  if coupon is not null then
    update public.coupons set used = used + 1 where code = coupon ->> 'code';
  end if;

  insert into public.order_events (order_number, text) values (v_number, 'Order placed on the website');

  return jsonb_build_object('number', v_number, 'accessToken', v_token, 'total', v_subtotal - v_discount + v_shipping);
end;
$$;

-- ---------- Throttled lookups and sign-ups ----------

-- Guessing phone numbers for an order: 10 tries per order every 15 minutes
create or replace function public.track_order(order_number text, phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.throttle('track:' || upper(trim(order_number)), 10, interval '15 minutes');
  return (
    select public.order_json(o) from public.orders o
    where o.number = upper(trim(order_number)) and o.customer_phone = phone
  );
end;
$$;

create or replace function public.subscribe(email text, name text default null, source public.subscriber_source default 'Footer')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID: email'; end if;
  perform public.throttle('subscribe:' || lower(trim(email)), 5, interval '1 hour');
  perform public.throttle('subscribe:all', 200, interval '1 hour');
  insert into public.subscribers (email, name, source)
  values (lower(trim(email)), nullif(trim(name), ''), source)
  on conflict on constraint subscribers_pkey
    do update set subscribed = true, unsubscribed_at = null, name = coalesce(excluded.name, public.subscribers.name);
end;
$$;

-- Reviews: 5 an hour per account
create or replace function public.throttle_reviews()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    perform public.throttle('review:' || new.user_id, 5, interval '1 hour');
  end if;
  return new;
end;
$$;

create trigger reviews_throttle before insert on public.reviews
  for each row execute function public.throttle_reviews();
