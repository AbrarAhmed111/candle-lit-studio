-- Colours: a product can come in several colours, and the customer picks one.
-- Stock stays per size, shared by every colour of that size.

-- [{ "name": "Ivory", "hex": "#F4EEE1" }], in the order shown. Empty means no choice.
alter table public.products
  add column colours jsonb not null default '[]'::jsonb check (jsonb_typeof(colours) = 'array');

-- The colour the customer chose for this line
alter table public.order_lines add column colour text;

-- Order JSON shows the colour of each line
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
        'colour', l.colour,
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
    'payment', case when o.payment_method = 'Easypaisa' then jsonb_strip_nulls(jsonb_build_object(
      'reference', o.payment_reference,
      'submittedAt', o.payment_submitted_at,
      'verifiedAt', o.payment_verified_at,
      'rejectionReason', o.payment_rejection_reason,
      'proof', case when with_internal then o.payment_proof end
    )) end,
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

-- Checkout: each line carries its colour, checked against the product
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
  v_method text;
  v_reference text;
  v_proof text;
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

  -- Every order is paid by Easypaisa before it is confirmed
  v_method := 'Easypaisa';
  v_reference := public.clean_payment_reference(payload -> 'payment' ->> 'reference');
  v_proof := payload -> 'payment' ->> 'proof';
  perform public.check_easypaisa_payment(v_reference, v_proof, null);

  perform public.throttle('order:' || v_phone, 5, interval '1 hour');
  perform public.throttle('order:all', 300, interval '1 hour');

  drop table if exists pg_temp.cart_lines;
  create temporary table cart_lines on commit drop as
    select l ->> 'variantId' as variant_id, nullif(trim(l ->> 'colour'), '') as colour,
           sum((l ->> 'qty')::integer)::integer as qty
    from jsonb_array_elements(payload -> 'lines') l
    group by 1, 2;

  if exists (select 1 from cart_lines where qty is null or qty < 1 or qty > 100) then
    raise exception 'INVALID: quantity';
  end if;

  -- Prices and stock are checked per size, adding up every colour of it
  for item in select c.variant_id, sum(c.qty)::integer as qty from cart_lines c group by 1 order by 1 loop
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

  -- A product with colours needs one of them. A product without colours takes none.
  if exists (
    select 1 from cart_lines c
    join public.variants va on va.id = c.variant_id
    join public.products p on p.id = va.product_id
    where case
      when jsonb_array_length(p.colours) = 0 then c.colour is not null
      else c.colour is null or not exists (
        select 1 from jsonb_array_elements(p.colours) pc where pc ->> 'name' = c.colour
      )
    end
  ) then
    raise exception 'COLOUR: Choose one of the colours shown for each candle, then try again.';
  end if;

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
    customer_notes, subtotal, coupon_code, coupon_discount, shipping, total, whatsapp_opt_in, cart_id,
    payment_method, payment_status, payment_reference, payment_proof, payment_submitted_at
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
    v_cart,
    v_method,
    'Pending Verification',
    v_reference,
    v_proof,
    now()
  )
  returning number, access_token into v_number, v_token;

  insert into public.order_lines (order_number, product_id, variant_id, name, variant_label, colour, qty, unit_price, original_price)
  select v_number, p.id, va.id, p.name, va.label, c.colour, c.qty, public.sale_price(va.price, public.effective_discount(p)), va.price
  from cart_lines c
  join public.variants va on va.id = c.variant_id
  join public.products p on p.id = va.product_id;

  perform set_config('app.stock_reason', 'Order placed', true);
  perform set_config('app.stock_order', v_number, true);
  update public.variants va set stock = va.stock - c.qty
    from (select variant_id, sum(qty)::integer as qty from cart_lines group by 1) c where va.id = c.variant_id;
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
  insert into public.order_events (order_number, text)
  values (v_number, 'Easypaisa payment sent for checking, transaction ID ' || v_reference);

  return jsonb_build_object('number', v_number, 'accessToken', v_token, 'total', v_subtotal - v_discount + v_shipping);
end;
$$;

-- Orders entered by hand keep their colours
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
  v_method text := 'Easypaisa';
begin
  if not public.staff_can('Orders') then raise exception 'FORBIDDEN'; end if;

  insert into public.orders (
    number, source, placed_at, status, customer_name, customer_phone, customer_email, city, area,
    address, landmark, postal_code, customer_notes, subtotal, coupon_code, coupon_discount, shipping, total,
    payment_method, payment_status, payment_reference
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
    (payload ->> 'total')::integer,
    v_method,
    case when payload ->> 'paymentStatus' = 'Pending Verification' then 'Pending Verification' else 'Paid' end::public.payment_status,
    public.clean_payment_reference(payload -> 'payment' ->> 'reference')
  )
  returning number into v_number;

  for line in select * from jsonb_array_elements(payload -> 'lines') loop
    insert into public.order_lines (order_number, product_id, variant_id, name, variant_label, colour, qty, unit_price, original_price)
    values (
      v_number,
      nullif(line ->> 'productId', ''),
      coalesce(nullif(line ->> 'variantId', ''), (select va.id from public.variants va
        where va.product_id = line ->> 'productId' and va.label = line ->> 'variant' limit 1)),
      line ->> 'name',
      line ->> 'variant',
      nullif(trim(line ->> 'colour'), ''),
      (line ->> 'qty')::integer,
      (line ->> 'unitPrice')::integer,
      (line ->> 'originalPrice')::integer
    );
  end loop;

  perform set_config('app.stock_reason', 'Manual order', true);
  perform set_config('app.stock_order', v_number, true);
  update public.variants va set stock = greatest(0, va.stock - l.qty)
    from (select ol.variant_id, sum(ol.qty)::integer as qty from public.order_lines ol
            where ol.order_number = v_number group by 1) l where l.variant_id = va.id;
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

-- Editing an order keeps colours and moves stock per size
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
    from (select ol.variant_id, sum(ol.qty)::integer as qty from public.order_lines ol
            where ol.order_number = o.number group by 1) l where l.variant_id = va.id;
  delete from public.order_lines l where l.order_number = o.number;

  insert into public.order_lines (order_number, product_id, variant_id, name, variant_label, colour, qty, unit_price, original_price)
  select o.number, p.id, va.id, p.name, va.label, nullif(trim(l ->> 'colour'), ''), (l ->> 'qty')::integer,
         coalesce((l ->> 'unitPrice')::integer, public.sale_price(va.price, public.effective_discount(p))), va.price
  from jsonb_array_elements(lines) l
  join public.variants va on va.id = l ->> 'variantId'
  join public.products p on p.id = va.product_id
  where (l ->> 'qty')::integer > 0;

  if exists (
    select 1 from (select ol.variant_id, sum(ol.qty)::integer as qty from public.order_lines ol
                   where ol.order_number = o.number group by 1) l
    join public.variants va on va.id = l.variant_id
    where va.stock < l.qty
  ) then
    raise exception 'OUT_OF_STOCK: not enough stock for this change';
  end if;
  update public.variants va set stock = va.stock - l.qty
    from (select ol.variant_id, sum(ol.qty)::integer as qty from public.order_lines ol
            where ol.order_number = o.number group by 1) l where l.variant_id = va.id;
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

-- Cancelled or returned orders put back the total of each size
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
      from (select ol.variant_id, sum(ol.qty)::integer as qty from public.order_lines ol
            where ol.order_number = new.number group by 1) l where l.variant_id = va.id;
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
