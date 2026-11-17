-- Every order is paid by Easypaisa, in every city. Cash on delivery is gone
-- for new orders (old cash orders keep their records).
-- Easypaisa is a manual transfer: the customer pays the shop's account, then
-- sends the transaction ID and a screenshot. The owner checks the payment in
-- the dashboard and approves or rejects it. Payment status stays separate
-- from the order status, but an unpaid Easypaisa order cannot move forward.

-- ---------- Settings: the account customers pay into ----------

alter table public.store_settings
  add column easypaisa_name text not null default '',
  add column easypaisa_number text not null default '';

-- ---------- Orders: what the customer sent ----------

alter table public.orders
  add column payment_reference text,
  -- Path of the screenshot in the private payment-proofs bucket
  add column payment_proof text,
  add column payment_submitted_at timestamptz,
  add column payment_verified_at timestamptz,
  add column payment_rejection_reason text;

-- One transaction ID pays for one order (a rejected one can be used again)
create unique index orders_payment_reference_idx on public.orders (payment_reference)
  where payment_reference is not null and payment_status <> 'Payment Rejected';

-- ---------- Rules ----------

-- New orders default to Easypaisa
alter table public.orders
  alter column payment_method set default 'Easypaisa',
  alter column payment_status set default 'Pending Verification';

-- Delivery inside Quetta costs Rs. 500 (the owner can change it in Settings)
insert into public.shipping_rates (city, area, fee) values ('Quetta', '', 500)
on conflict (city, area) do update set fee = 500, active = true;

-- Transaction IDs are compared without spaces or dashes, in capitals
create or replace function public.clean_payment_reference(reference text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(upper(regexp_replace(coalesce(reference, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

-- Checks the details a customer sends for an Easypaisa payment
create or replace function public.check_easypaisa_payment(reference text, proof text, except_order text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce((select s.easypaisa_number from public.store_settings s where s.id = 1), '') = '' then
    raise exception 'PAYMENT: Easypaisa payments are not set up yet. Please call or WhatsApp us to place your order.';
  end if;
  if check_easypaisa_payment.reference is null or check_easypaisa_payment.reference !~ '^[A-Z0-9]{6,30}$' then
    raise exception 'PAYMENT: Enter the transaction ID (TID) from your Easypaisa receipt.';
  end if;
  if check_easypaisa_payment.proof is null
     or check_easypaisa_payment.proof !~ '^checkout/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
     or not exists (
       select 1 from storage.objects so
       where so.bucket_id = 'payment-proofs' and so.name = check_easypaisa_payment.proof
     ) then
    raise exception 'PAYMENT: Upload a screenshot of your Easypaisa payment.';
  end if;
  if exists (
    select 1 from public.orders o
    where o.payment_reference = check_easypaisa_payment.reference
      and o.payment_status <> 'Payment Rejected'
      and o.number is distinct from check_easypaisa_payment.except_order
  ) then
    raise exception 'PAYMENT: This transaction ID was already used for another order. Check the ID on your receipt.';
  end if;
end;
$$;

-- An Easypaisa order moves forward only once its payment is approved
create or replace function public.guard_unpaid_orders()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_method = 'Easypaisa'
     and new.payment_status <> 'Paid'
     and new.status is distinct from old.status
     and new.status in ('Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered') then
    raise exception 'PAYMENT_UNVERIFIED';
  end if;
  return new;
end;
$$;

create trigger orders_payment_gate before update on public.orders
  for each row execute function public.guard_unpaid_orders();

-- ---------- Payment screenshots ----------

-- Private: only the team can open them
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "shoppers upload payment screenshots" on storage.objects for insert
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = 'checkout');
create policy "staff view payment screenshots" on storage.objects for select
  using (bucket_id = 'payment-proofs' and public.staff_can('Orders'));

-- Order JSON carries the payment details (the screenshot path only for staff)
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

-- ---------- Checkout ----------

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
  insert into public.order_events (order_number, text)
  values (v_number, 'Easypaisa payment sent for checking, transaction ID ' || v_reference);

  return jsonb_build_object('number', v_number, 'accessToken', v_token, 'total', v_subtotal - v_discount + v_shipping);
end;
$$;

-- Orders taken by phone are Easypaisa too (paid unless marked as still to check)
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

-- ---------- Checking a payment ----------

-- The owner approves or rejects an Easypaisa payment after checking their account
create or replace function public.admin_review_payment(order_number text, approve boolean, reason text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  if not public.staff_can('Orders') then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where number = admin_review_payment.order_number for update;
  if not found then raise exception 'INVALID: order'; end if;
  if o.payment_method <> 'Easypaisa' then raise exception 'INVALID: not an Easypaisa order'; end if;

  if approve then
    update public.orders set
      payment_status = 'Paid',
      payment_verified_at = now(),
      payment_rejection_reason = null
    where number = o.number;
    insert into public.order_events (order_number, text, actor)
    values (o.number, 'Easypaisa payment approved' || coalesce(', transaction ID ' || o.payment_reference, ''), auth.uid());
  else
    if o.status in ('Dispatched', 'Delivered', 'Failed Delivery', 'Returned') then
      raise exception 'INVALID: order already dispatched';
    end if;
    if coalesce(char_length(trim(reason)), 0) < 5 then raise exception 'INVALID: reason'; end if;
    update public.orders set
      payment_status = 'Payment Rejected',
      payment_verified_at = null,
      payment_rejection_reason = left(trim(reason), 500)
    where number = o.number;
    insert into public.order_events (order_number, text, actor)
    values (o.number, 'Easypaisa payment rejected: ' || left(trim(reason), 200), auth.uid());
  end if;
end;
$$;
grant execute on function public.admin_review_payment(text, boolean, text) to authenticated;

-- After a rejection the customer sends a new transaction ID and screenshot
-- from the order or tracking page
create or replace function public.resubmit_payment(order_number text, phone text, token uuid, reference text, proof text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_reference text := public.clean_payment_reference(reference);
begin
  perform public.throttle('payment:' || upper(trim(resubmit_payment.order_number)), 5, interval '1 hour');
  select * into o from public.orders
    where number = upper(trim(resubmit_payment.order_number))
      and (customer_phone = resubmit_payment.phone or access_token = token or (auth.uid() is not null and user_id = auth.uid()));
  if not found then raise exception 'INVALID: order'; end if;
  if o.payment_method <> 'Easypaisa' or o.payment_status <> 'Payment Rejected' or o.status = 'Cancelled' then
    raise exception 'PAYMENT: This order is not waiting for new payment details.';
  end if;
  perform public.check_easypaisa_payment(v_reference, proof, o.number);

  update public.orders set
    payment_status = 'Pending Verification',
    payment_reference = v_reference,
    payment_proof = proof,
    payment_submitted_at = now(),
    payment_rejection_reason = null
  where number = o.number;
  insert into public.order_events (order_number, text)
  values (o.number, 'Customer sent new Easypaisa payment details, transaction ID ' || v_reference);
  return o.number;
end;
$$;
grant execute on function public.resubmit_payment(text, text, uuid, text, text) to anon, authenticated;

-- ---------- Emails ----------

-- Payment wording now depends on the method: {{payment_note}} fills it in
update public.message_templates
  set body = replace(body, 'Total to pay on delivery: {{order_total}}.', '{{payment_note}}')
  where channel = 'email';
update public.message_templates
  set body = replace(body, 'Please keep {{order_total}} ready in cash for the rider.', '{{payment_note}}')
  where id = 'e-dispatch';
update public.message_templates
  set body = replace(body, 'Nothing was charged.', '{{cancel_payment_note}}')
  where id = 'e-cancel';
update public.message_templates
  set body = replace(body, 'Total (COD): {{order_total}}', 'Total: {{order_total}}, {{payment_method}}')
  where id = 'e-owner-order';
update public.message_templates
  set body = replace(body, ' Cash on delivery, as always.', '')
  where id = 'e-cart';

insert into public.message_templates (id, channel, audience, name, trigger, subject, body, active) values
  ('e-payment-approved', 'email', 'Customer', 'Payment received', 'When you approve an Easypaisa payment',
   'Payment received for order {{order_number}}',
   E'Assalam o alaikum {{customer_name}},\n\nWe have received your Easypaisa payment of {{order_total}} for order {{order_number}}. Thank you.\n\nWe are preparing your candles now and will email you when they are on their way.', true),
  ('e-payment-rejected', 'email', 'Customer', 'Payment not confirmed', 'When you reject an Easypaisa payment',
   'Please check your payment for order {{order_number}}',
   E'Assalam o alaikum {{customer_name}},\n\nWe could not confirm your Easypaisa payment for order {{order_number}}.\n\nReason: {{message}}\n\nPress the button below, enter your mobile number and send the correct transaction ID and screenshot. If you have not paid yet, send {{order_total}} to our Easypaisa account first. Your order is on hold until then.\n\nQuestions? Reply to this email or WhatsApp us.', true),
  ('e-owner-payment', 'email', 'Owner', 'Payment to check', 'When a customer sends new Easypaisa payment details',
   'Easypaisa payment to check: {{order_number}}',
   E'{{customer_name}} ({{customer_phone}}) sent new Easypaisa payment details for order {{order_number}}.\n\nTransaction ID: {{transaction_id}}\nAmount due: {{order_total}}\n\nOpen the order, compare it with your Easypaisa account, then approve or reject the payment.', true)
on conflict (id) do nothing;

-- Helpers used only inside the functions above
revoke execute on function public.check_easypaisa_payment(text, text, text) from public, anon, authenticated;

-- The store banner no longer promises cash on delivery
update public.store_settings
  set announcement = 'Pay easily with Easypaisa. Delivery across Pakistan, free on orders over Rs. 5,000.'
  where announcement = 'Cash on delivery across Pakistan. Free delivery on orders over Rs. 5,000.';
