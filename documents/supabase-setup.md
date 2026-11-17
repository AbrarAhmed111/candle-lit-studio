# Connecting Supabase and Google sign-in

The store runs on demo data until real Supabase keys are set. Once they are,
every page reads and writes the database. No code changes are needed.

What switches over:

- **Storefront.** Products, categories, reviews, settings, couriers and the
  running campaign load from the database. The cache refreshes as soon as the
  dashboard saves a change.
- **Checkout.** Orders go through `place_order()`, which checks prices, stock
  and the coupon again before saving. Stock goes down when an order is placed
  and back up when it is cancelled.
- **Confirmation and tracking.** The browser that placed an order opens it with
  a private link. Anyone else needs the order number and the phone number used
  at checkout.
- **Accounts.** Sign-in works with Google or with email and password. Each
  customer's profile, addresses, orders and wishlist are saved to the database.
- **Dashboard.** Only people listed in Team can open it. Managers see only the
  modules ticked for them. Every edit is saved to the database.
- **Product photos.** Photos upload to the `product-images` storage bucket.

## 1. Create the project

1. Create a project at https://supabase.com/dashboard. Choose the Mumbai or
   Singapore region, which is closest to Pakistan.
2. Under **Project Settings > API Keys**, copy the **Project URL** and the
   **publishable** key (the legacy **anon** key also works).
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   NEXT_PUBLIC_SITE_URL=https://<your domain>
   ```

   Set the same three variables in Vercel under **Settings > Environment
   Variables**. Also clear the placeholder values in `.env`.

## 2. Create the tables

Pick one way.

**With the Supabase CLI (recommended)**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --include-seed
```

**Without the CLI**

Open **SQL Editor** in the Supabase dashboard. Run each file in
`supabase/migrations/` in name order, then run `supabase/seed.sql`.

### The seed and the first administrator

`supabase/seed.sql` loads the current demo catalogue, coupons, campaign,
settings and message templates. It also adds one administrator. Rebuild the
seed with your own Google email before you run it:

```bash
OWNER_EMAIL=you@gmail.com npm run db:seed
```

On Windows PowerShell:

```powershell
$env:OWNER_EMAIL="you@gmail.com"; npm run db:seed
```

If the seed has already run, add yourself in the SQL Editor instead:

```sql
insert into public.team_members (name, email, role)
values ('Store owner', 'you@gmail.com', 'Administrator');
```

Add more team members later from **Dashboard > Team**. Use the email they sign
in with.

## 3. Switch on Google sign-in

1. In Google Cloud Console (https://console.cloud.google.com), go to **APIs &
   Services > OAuth consent screen**. Set it up as **External**, with the
   store name and support email.
2. Go to **Credentials > Create credentials > OAuth client ID** and choose
   **Web application**.
   - **Authorised JavaScript origins:** `https://<your domain>` and
     `http://localhost:3000`
   - **Authorised redirect URI:**
     `https://<project-ref>.supabase.co/auth/v1/callback`
3. Copy the client ID and the client secret.
4. In Supabase, go to **Authentication > Providers > Google**. Switch it on and
   paste the client ID and secret.
5. In **Authentication > URL Configuration**:
   - **Site URL:** `https://<your domain>`
   - **Redirect URLs:** add `https://<your domain>/auth/callback`,
     `http://localhost:3000/auth/callback` and, if the dashboard has its own
     host, `https://admin.<your domain>/auth/callback`.

Email and password sign-in works without extra setup. To let customers sign in
straight away without a confirmation email, turn off **Confirm email** under
**Authentication > Providers > Email**.

## 4. Check it works

1. Run `npm run dev` and open http://localhost:3000. The demo banners are gone.
2. Sign in with the Google account you set as administrator, then open
   `/admin`. Your name shows at the bottom of the sidebar.
3. Place a test order on the storefront. It appears in **Dashboard > Orders**,
   and the stock for that size goes down.
4. Open **Dashboard > Products**, change a price and save. Reload the product
   page: the new price shows.

## Notes

- **Admin host in production.** `src/middleware.ts` serves `/admin` only on an
  `admin.` subdomain in production. Add `admin.<your domain>` to Vercel and to
  the Supabase redirect URLs. On localhost both run on one host.
- **Database types.** After linking, `npm run db:types` writes generated types
  to `src/lib/supabase/database.types.ts`, if you want typed queries.
- **Keys.** Only the anon key is used, and row level security protects every
  table. Never put the `service_role` key in a `NEXT_PUBLIC_` variable.
- **Not built yet.** Email and WhatsApp sending. Templates and newsletter drafts
  are saved, but no message is sent until an email service and WhatsApp
  Business are connected.

## Where things live

| Area | Files |
| --- | --- |
| Tables, security, functions, storage | `supabase/migrations/` |
| Starting data | `supabase/seed.sql`, built by `scripts/generate-seed.ts` |
| Supabase clients and the demo or live switch | `src/lib/supabase/` |
| Storefront catalogue loading | `src/lib/catalog/` |
| Server actions | `src/lib/actions/` (`auth`, `store`, `account`, `admin`) |
| Google sign-in return | `src/app/auth/callback/route.ts` |
| Session refresh and route protection | `src/middleware.ts`, `src/lib/supabase/middleware.ts` |
