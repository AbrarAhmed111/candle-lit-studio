-- Email: delivery log, unsubscribe links, newsletter sends and the extra templates.
-- Emails are sent from the app with nodemailer (SMTP). The server writes the
-- log with the service role key; the team reads it in the dashboard.

create type public.email_status as enum ('sent', 'failed', 'skipped');

create table public.email_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- message_templates.id, or 'newsletter' / 'test'
  template_id text not null,
  to_email text not null,
  subject text not null default '',
  order_number text references public.orders (number) on delete set null,
  -- For one-off emails that must never repeat, such as a low-stock alert for one size today
  dedupe_key text,
  status public.email_status not null,
  error text,
  attempts integer not null default 1
);

create index email_log_created_idx on public.email_log (created_at desc);
create index email_log_order_idx on public.email_log (order_number, template_id);
create unique index email_log_dedupe_idx on public.email_log (dedupe_key) where dedupe_key is not null and status = 'sent';

alter table public.email_log enable row level security;
create policy "staff read email log" on public.email_log for select using (public.staff_can('Messages') or public.staff_can('Newsletter'));

-- Every subscriber gets a private unsubscribe link
alter table public.subscribers
  add column unsubscribe_token uuid not null default gen_random_uuid(),
  add column unsubscribed_at timestamptz;
create unique index subscribers_token_idx on public.subscribers (unsubscribe_token);

-- Newsletter drafts remember when they went out
alter table public.newsletter_drafts
  add column sent_at timestamptz,
  add column sent_count integer not null default 0;

-- Templates the app sends that the first seed did not include
insert into public.message_templates (id, channel, audience, name, trigger, subject, body, active) values
  ('e-confirmed', 'email', 'Customer', 'Order confirmed', 'When you confirm an order',
   'Order {{order_number}} is confirmed',
   E'Assalam o alaikum {{customer_name}},\n\nThank you for confirming. We are preparing order {{order_number}} now.\n\n{{order_details}}\n\nDelivering to: {{delivery_address}}\nTotal to pay on delivery: {{order_total}}.', true),
  ('e-processing', 'email', 'Customer', 'Order being prepared', 'When you start preparing an order',
   'We are pouring your order {{order_number}}',
   E'Assalam o alaikum {{customer_name}},\n\nYour candles are being prepared in our studio. We will let you know as soon as they are on their way.', false),
  ('e-packed', 'email', 'Customer', 'Order packed', 'When you mark an order as packed',
   'Order {{order_number}} is packed',
   E'Assalam o alaikum {{customer_name}},\n\nOrder {{order_number}} is packed and waiting for the courier.', false),
  ('e-order-delivered', 'email', 'Customer', 'Order delivered', 'When you mark an order as delivered',
   'Order {{order_number}} has been delivered',
   E'Assalam o alaikum {{customer_name}},\n\nOrder {{order_number}} has been delivered. We hope the candles make your home feel warm.\n\nThank you for shopping with {{store_name}}.', true),
  ('e-welcome', 'email', 'Customer', 'Newsletter welcome', 'When someone joins the newsletter',
   'Welcome to {{store_name}}',
   E'Thank you for joining us.\n\nUse the code WELCOME10 for 10% off your first order, up to Rs. 500.\n\nWe write about new scents and seasonal pours about twice a month. You can leave at any time.', true),
  ('e-owner-order', 'email', 'Owner', 'New order alert', 'When a customer places an order',
   'New order {{order_number}}, {{order_total}}',
   E'New order {{order_number}} from {{customer_name}} ({{customer_phone}}).\n\n{{order_details}}\n\nDeliver to: {{delivery_address}}\nTotal (COD): {{order_total}}\n\nCall or WhatsApp the customer to confirm it.', true),
  ('e-owner-cancel', 'email', 'Owner', 'Order cancelled alert', 'When an order is cancelled',
   'Order {{order_number}} was cancelled',
   E'Order {{order_number}} from {{customer_name}} was cancelled.\n\n{{order_details}}\n\nThe stock has been put back.', true),
  ('e-owner-inquiry', 'email', 'Owner', 'Customer message', 'When someone writes through the Contact page',
   'Message from {{customer_name}}',
   E'{{customer_name}} wrote through the Contact page.\n\nReply to: {{customer_contact}}\n\n{{message}}', true),
  ('e-owner-stock', 'email', 'Owner', 'Low stock alert', 'When a size drops to 5 or fewer after an order',
   'Low stock: {{product_name}}',
   E'{{product_name}} is running low: {{stock_left}} left.\n\nRestock it or switch the size off in Products.', true)
on conflict (id) do nothing;

-- The review request goes out three days after delivery (see /api/cron/review-requests)
update public.message_templates
  set name = 'Review request', trigger = 'Three days after an order is delivered'
  where id = 'e-delivered';
