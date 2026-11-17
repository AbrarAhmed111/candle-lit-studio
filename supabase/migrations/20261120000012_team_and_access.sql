-- Team members who already had an account when they were added are linked
-- straight away, so the dashboard knows they have signed in. A new email
-- address links to that account instead (or to none until they sign up).

create or replace function public.link_team_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.email is distinct from old.email then
    new.user_id := (select u.id from auth.users u where lower(u.email) = new.email limit 1);
  end if;
  return new;
end;
$$;

create trigger team_members_link before insert or update of email on public.team_members
  for each row execute function public.link_team_member();

update public.team_members t
  set user_id = u.id
  from auth.users u
  where t.user_id is null and lower(u.email) = t.email;

-- ---------- Payments access ----------

-- The dashboard area once called 'COD payments' is now 'Payments' (Easypaisa
-- and older cash orders). Older rules that still say 'COD payments' keep
-- working: either name grants the other.
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
      and (
        t.role = 'Administrator'
        or module = any (t.modules)
        or (module in ('Payments', 'COD payments') and t.modules && array['Payments', 'COD payments'])
      )
  )
$$;

update public.team_members set modules = array_replace(modules, 'COD payments', 'Payments')
  where 'COD payments' = any (modules);

-- People who check payments can approve them and see the screenshots
create or replace function public.admin_review_payment(order_number text, approve boolean, reason text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  if not (public.staff_can('Orders') or public.staff_can('Payments')) then raise exception 'FORBIDDEN'; end if;
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

drop policy if exists "staff view payment screenshots" on storage.objects;
create policy "staff view payment screenshots" on storage.objects for select
  using (bucket_id = 'payment-proofs' and (public.staff_can('Orders') or public.staff_can('Payments')));

-- ---------- Inbox ----------

-- Marking a message as handled saves it with an upsert, which must also pass
-- an insert rule. The public rule only allows new, unhandled messages.
create policy "staff save messages" on public.contact_messages for insert
  with check (public.staff_can('Messages'));
