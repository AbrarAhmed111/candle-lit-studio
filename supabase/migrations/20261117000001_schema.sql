-- Candle Lit Studio: core schema
-- Money is stored in whole rupees (integer). Times are timestamptz.


-- ---------- Types ----------

create type public.order_status as enum (
  'Pending Confirmation',
  'Confirmed',
  'Processing',
  'Packed',
  'Dispatched',
  'Delivered',
  'Cancelled'
);

-- COD money moves in three steps: customer pays the courier, the courier
-- holds it, then the courier settles with the business.
create type public.payment_status as enum (
  'Pending Collection',
  'Collected by Courier',
  'Settled to Business'
);

create type public.coupon_type as enum ('percent', 'fixed', 'free_shipping');
create type public.fragrance_family as enum ('Floral', 'Woody', 'Gourmand', 'Fresh', 'Earthy', 'Unscented');
create type public.review_status as enum ('Pending', 'Approved', 'Rejected');
create type public.staff_role as enum ('Administrator', 'Manager');
create type public.subscriber_source as enum ('Popup', 'Footer', 'Checkout');
create type public.template_channel as enum ('email', 'whatsapp');
create type public.template_audience as enum ('Customer', 'Owner');
create type public.order_source as enum ('website', 'manual');
create type public.order_event_kind as enum ('history', 'note');

-- ---------- Helpers ----------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Store settings (one row) ----------

create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  email text not null,
  phone text not null default '',
  whatsapp text not null default '',
  address text not null default '',
  announcement text not null default '',
  instagram text not null default '',
  facebook text not null default '',
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  -- 0 switches free delivery off
  free_shipping_over integer not null default 0 check (free_shipping_over >= 0),
  delivery_estimate text not null default '',
  updated_at timestamptz not null default now()
);

create trigger store_settings_touch before update on public.store_settings
  for each row execute function public.touch_updated_at();

create table public.couriers (
  name text primary key,
  tracking_url text not null default '',
  active boolean not null default true,
  sort integer not null default 0
);

-- ---------- Catalogue ----------

create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  -- Product slug or photo id used as the category picture
  cover text not null default '',
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key default ('p' || replace(gen_random_uuid()::text, '-', '')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  tagline text not null default '',
  description text not null default '',
  categories text[] not null default '{}',
  tags text[] not null default '{}',
  fragrance text,
  fragrance_family public.fragrance_family not null default 'Floral',
  -- { top, middle, base }
  notes jsonb,
  wax_type text,
  colour text,
  dimensions text,
  ingredients text,
  -- { shape, wax, vessel, bg }: colours for the drawn candle and photo background
  art jsonb not null default '{"shape":"jar","wax":"#EADFCB","vessel":"#F3E7D8","bg":"#EADFCB"}',
  -- Photo ids or full URLs, first one is the main photo
  images text[] not null default '{}',
  discount_percent integer check (discount_percent between 1 and 90),
  -- Kept up to date from approved reviews and placed orders
  rating numeric(2, 1) not null default 0,
  review_count integer not null default 0,
  sold integer not null default 0,
  featured boolean not null default false,
  best_seller boolean not null default false,
  is_new boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_categories_idx on public.products using gin (categories);
create index products_active_idx on public.products (active);

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.variants (
  id text primary key default ('v' || replace(gen_random_uuid()::text, '-', '')),
  product_id text not null references public.products (id) on delete cascade,
  label text not null,
  sku text not null unique,
  price integer not null check (price > 0),
  stock integer not null default 0 check (stock >= 0),
  weight text,
  burn_time text,
  sort integer not null default 0
);

create index variants_product_idx on public.variants (product_id);

-- ---------- Promotions ----------

create table public.coupons (
  code text primary key check (code = upper(code)),
  type public.coupon_type not null,
  value integer not null default 0 check (value >= 0),
  min_cart integer check (min_cart >= 0),
  max_discount integer check (max_discount >= 0),
  expires_at date,
  description text not null default '',
  active boolean not null default true,
  used integer not null default 0,
  max_uses integer check (max_uses > 0),
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id text primary key default ('c' || replace(gen_random_uuid()::text, '-', '')),
  name text not null,
  description text not null default '',
  starts_at date not null,
  ends_at date not null,
  discount_percent integer not null check (discount_percent between 1 and 90),
  -- Category slugs. Empty means the whole store.
  categories text[] not null default '{}',
  active boolean not null default true,
  check (ends_at >= starts_at)
);

-- ---------- Customers ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  newsletter boolean not null default false,
  whatsapp boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Home',
  name text not null,
  phone text not null,
  address text not null,
  area text not null default '',
  city text not null,
  landmark text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id);
-- One default address per customer
create unique index addresses_one_default on public.addresses (user_id) where is_default;

create table public.wishlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Orders ----------

create sequence public.order_number_seq start with 1032;

create table public.orders (
  number text primary key default ('CND-' || nextval('public.order_number_seq')),
  -- Secret that lets a guest open their own confirmation page
  access_token uuid not null default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  source public.order_source not null default 'website',
  placed_at timestamptz not null default now(),
  status public.order_status not null default 'Pending Confirmation',
  payment_status public.payment_status not null default 'Pending Collection',
  payment_method text not null default 'Cash on Delivery',
  customer_name text not null,
  -- 03XXXXXXXXX
  customer_phone text not null check (customer_phone ~ '^03[0-9]{9}$'),
  customer_email text,
  city text not null,
  area text not null default '',
  address text not null,
  landmark text,
  customer_notes text,
  subtotal integer not null check (subtotal >= 0),
  coupon_code text,
  coupon_discount integer not null default 0 check (coupon_discount >= 0),
  shipping integer not null default 0 check (shipping >= 0),
  total integer not null check (total >= 0),
  cancel_reason text,
  updated_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id);
create index orders_phone_idx on public.orders (customer_phone);
create index orders_placed_idx on public.orders (placed_at desc);
create index orders_status_idx on public.orders (status);

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_lines (
  id bigint generated always as identity primary key,
  order_number text not null references public.orders (number) on delete cascade,
  product_id text references public.products (id) on delete set null,
  variant_id text,
  name text not null,
  variant_label text not null,
  qty integer not null check (qty > 0),
  unit_price integer not null check (unit_price >= 0),
  original_price integer not null check (original_price >= 0)
);

create index order_lines_order_idx on public.order_lines (order_number);

create table public.shipments (
  order_number text primary key references public.orders (number) on delete cascade,
  courier text not null,
  tracking_id text not null,
  tracking_url text not null default '',
  dispatched_at timestamptz not null default now()
);

-- History is shown to the team, notes are internal. Neither reaches customers.
create table public.order_events (
  id bigint generated always as identity primary key,
  order_number text not null references public.orders (number) on delete cascade,
  kind public.order_event_kind not null default 'history',
  text text not null,
  at timestamptz not null default now(),
  actor uuid references auth.users (id) on delete set null
);

create index order_events_order_idx on public.order_events (order_number, at);

-- ---------- Reviews ----------

create table public.reviews (
  id text primary key default ('r' || replace(gen_random_uuid()::text, '-', '')),
  product_id text not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author text not null,
  city text not null default '',
  rating integer not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  date date not null default current_date,
  -- The reviewer bought this product
  verified boolean not null default false,
  status public.review_status not null default 'Pending',
  created_at timestamptz not null default now()
);

create index reviews_product_idx on public.reviews (product_id, status);

-- ---------- Marketing and messages ----------

create table public.subscribers (
  email text primary key check (email = lower(email)),
  name text,
  source public.subscriber_source not null default 'Footer',
  joined_at timestamptz not null default now(),
  subscribed boolean not null default true
);

create table public.newsletter_drafts (
  id text primary key default ('d' || replace(gen_random_uuid()::text, '-', '')),
  subject text not null,
  body text not null,
  segment text not null,
  saved_at timestamptz not null default now()
);

create table public.message_templates (
  id text primary key,
  channel public.template_channel not null,
  audience public.template_audience not null,
  name text not null,
  trigger text not null,
  subject text,
  body text not null,
  active boolean not null default true
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Team and audit ----------

create table public.team_members (
  id text primary key default ('t' || replace(gen_random_uuid()::text, '-', '')),
  name text not null,
  email text not null unique check (email = lower(email)),
  role public.staff_role not null default 'Manager',
  -- Modules a manager may open. Administrators always have all of them.
  modules text[] not null default '{}',
  active boolean not null default true,
  -- Filled in when this person first signs in
  user_id uuid unique references auth.users (id) on delete set null
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  text text not null,
  actor uuid references auth.users (id) on delete set null
);

create index activity_log_at_idx on public.activity_log (at desc);
