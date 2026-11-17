-- Checkout, order lookups and the bookkeeping that keeps numbers right.
-- Prices are always recomputed here: nothing the browser sends is trusted.

-- ---------- Order as JSON, in the shape the app uses ----------

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
    'customer', jsonb_build_object(
      'name', o.customer_name,
      'phone', o.customer_phone,
      'email', o.customer_email,
      'city', o.city,
      'area', o.area,
      'address', o.address,
      'landmark', o.landmark,
      'notes', o.customer_notes
    ),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', coalesce(l.product_id, ''),
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
    'shipment', (
      select jsonb_build_object(
        'courier', s.courier,
        'trackingId', s.tracking_id,
        'trackingUrl', s.tracking_url,
        'dispatchedAt', s.dispatched_at
      )
      from public.shipments s where s.order_number = o.number
    ),
    'cancelReason', case when with_internal then o.cancel_reason end,
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

revoke execute on function public.order_json(public.orders, boolean) from public, anon, authenticated;

-- ---------- Coupons ----------

-- Returns the coupon when it can be used on this subtotal, or the reason it cannot
create or replace function public.validate_coupon(code text, subtotal integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.coupons;
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
  return jsonb_build_object('ok', true, 'coupon', jsonb_strip_nulls(jsonb_build_object(
    'code', c.code,
    'type', c.type,
    'value', c.value,
    'minCart', c.min_cart,
    'maxDiscount', c.max_discount,
    'expiresAt', c.expires_at,
    'description', c.description
  )));
end;
$$;

grant execute on function public.validate_coupon(text, integer) to anon, authenticated;

-- ---------- Checkout ----------

-- payload: {
--   customer: { name, phone, email?, city, area, address, landmark?, notes? },
--   lines: [{ variantId, qty }],
--   couponCode?
-- }
-- Returns { number, accessToken, total }. Errors start with a code the app
-- turns into a message: INVALID, OUT_OF_STOCK, UNAVAILABLE, COUPON.
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
  unit integer;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_shipping integer := 0;
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
    select va.id, va.label, va.price, va.stock, p.id as product_id, p.name, p.discount_percent, p.active
      into v
      from public.variants va
      join public.products p on p.id = va.product_id
      where va.id = item.variant_id
      for update of va;
    if not found then raise exception 'UNAVAILABLE: %', item.variant_id; end if;
    if not v.active then raise exception 'UNAVAILABLE: %', v.name; end if;
    if v.stock < item.qty then raise exception 'OUT_OF_STOCK: % %', v.name, v.label; end if;
    unit := case when v.discount_percent is null then v.price
                 else round(v.price * (1 - v.discount_percent / 100.0))::integer end;
    v_subtotal := v_subtotal + unit * item.qty;
  end loop;

  if nullif(trim(payload ->> 'couponCode'), '') is not null then
    coupon_check := public.validate_coupon(payload ->> 'couponCode', v_subtotal);
    if not (coupon_check ->> 'ok')::boolean then
      raise exception 'COUPON: %', coupon_check ->> 'message';
    end if;
    coupon := coupon_check -> 'coupon';
    if coupon ->> 'type' = 'percent' then
      v_discount := round(v_subtotal * (coupon ->> 'value')::integer / 100.0)::integer;
      if coupon ? 'maxDiscount' then v_discount := least(v_discount, (coupon ->> 'maxDiscount')::integer); end if;
    elsif coupon ->> 'type' = 'fixed' then
      v_discount := least((coupon ->> 'value')::integer, v_subtotal);
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
  select v_number, p.id, va.id, p.name, va.label, c.qty,
         case when p.discount_percent is null then va.price
              else round(va.price * (1 - p.discount_percent / 100.0))::integer end,
         va.price
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

grant execute on function public.place_order(jsonb) to anon, authenticated;

-- Orders entered by staff for phone and WhatsApp customers. The team has
-- already agreed the price, so the totals sent are kept as they are.
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
    address, landmark, customer_notes, subtotal, coupon_code, coupon_discount, shipping, total
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
      (select va.id from public.variants va
        where va.product_id = line ->> 'productId' and va.label = line ->> 'variant' limit 1),
      line ->> 'name',
      line ->> 'variant',
      (line ->> 'qty')::integer,
      (line ->> 'unitPrice')::integer,
      (line ->> 'originalPrice')::integer
    );
  end loop;

  update public.variants va set stock = greatest(0, va.stock - l.qty)
    from public.order_lines l where l.order_number = v_number and l.variant_id = va.id;
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

grant execute on function public.admin_create_order(jsonb) to authenticated;

-- Keep the order number sequence ahead of numbers entered by hand
create or replace function public.bump_order_sequence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n bigint := nullif(regexp_replace(new.number, '\D', '', 'g'), '')::bigint;
begin
  if n is not null and n >= (select last_value from public.order_number_seq) then
    perform setval('public.order_number_seq', n);
  end if;
  return new;
end;
$$;

create trigger orders_bump_sequence after insert on public.orders
  for each row execute function public.bump_order_sequence();

-- Cancelling puts the candles back on the shelf
create or replace function public.restock_cancelled_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'Cancelled' and old.status <> 'Cancelled' then
    update public.variants va set stock = va.stock + l.qty
      from public.order_lines l where l.order_number = new.number and l.variant_id = va.id;
    update public.products p set sold = greatest(0, p.sold - s.qty)
      from (select product_id, sum(qty) as qty from public.order_lines where order_number = new.number group by 1) s
      where p.id = s.product_id;
  end if;
  return new;
end;
$$;

create trigger orders_restock after update of status on public.orders
  for each row execute function public.restock_cancelled_order();

-- ---------- Order lookups ----------

-- Confirmation page for the browser that placed the order
create or replace function public.get_order(order_number text, token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.order_json(o) from public.orders o
  where o.number = upper(trim(order_number)) and o.access_token = token
$$;

-- Track order page: number and the phone used at checkout
create or replace function public.track_order(order_number text, phone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.order_json(o) from public.orders o
  where o.number = upper(trim(order_number)) and o.customer_phone = phone
$$;

create or replace function public.my_orders()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.order_json(o) order by o.placed_at desc), '[]'::jsonb)
  from public.orders o
  where auth.uid() is not null
    and (o.user_id = auth.uid() or (o.customer_email is not null and lower(o.customer_email) = public.current_email()))
$$;

create or replace function public.admin_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.staff_can('Orders') or public.staff_can('COD payments') or public.staff_can('Customers') or public.staff_can('Reports')) then
    raise exception 'FORBIDDEN';
  end if;
  return (
    select coalesce(jsonb_agg(public.order_json(o, true) order by o.placed_at desc), '[]'::jsonb)
    from public.orders o
  );
end;
$$;

grant execute on function public.get_order(text, uuid) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.my_orders() to authenticated;
grant execute on function public.admin_orders() to authenticated;

-- ---------- Reviews ----------

-- Signed-in customers only. Marked verified when they have bought the candle.
create or replace function public.submit_review(product text, rating integer, title text, body text, city text default '')
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
  if exists (select 1 from public.reviews r where r.product_id = product and r.user_id = auth.uid()) then
    raise exception 'DUPLICATE';
  end if;

  select coalesce(nullif(split_part(p.name, ' ', 1), '') || coalesce(' ' || nullif(left(split_part(p.name, ' ', 2), 1), '') || '.', ''), 'Customer')
    into author from public.profiles p where p.id = auth.uid();

  select exists (
    select 1 from public.orders o join public.order_lines l on l.order_number = o.number
    where o.user_id = auth.uid() and o.status = 'Delivered' and l.product_id = product
  ) into bought;

  insert into public.reviews (product_id, user_id, author, city, rating, title, body, verified)
  values (product, auth.uid(), coalesce(author, 'Customer'), coalesce(trim(city), ''), rating, trim(title), trim(body), bought)
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.submit_review(text, integer, text, text, text) to authenticated;

-- Rating and review count follow the approved reviews
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid text := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = pid and r.status = 'Approved'), 0),
    review_count = (select count(*) from public.reviews r where r.product_id = pid and r.status = 'Approved')
  where p.id = pid;
  return null;
end;
$$;

create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- ---------- Newsletter ----------

create or replace function public.subscribe(email text, name text default null, source public.subscriber_source default 'Footer')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID: email'; end if;
  insert into public.subscribers (email, name, source)
  values (lower(trim(email)), nullif(trim(name), ''), source)
  on conflict on constraint subscribers_pkey
    do update set subscribed = true, name = coalesce(excluded.name, public.subscribers.name);
end;
$$;

grant execute on function public.subscribe(text, text, public.subscriber_source) to anon, authenticated;
