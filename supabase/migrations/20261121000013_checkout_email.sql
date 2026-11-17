-- Checkout now requires an email address. Orders entered by hand in the
-- dashboard (phone orders) may still leave it empty.

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
  -- Every order needs an email: confirmation, payment checks and tracking go there
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID: email'; end if;
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
