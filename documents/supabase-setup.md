# Connecting Supabase and Google sign-in

The store runs on demo data until real Supabase keys are set. Once they are,
every page reads and writes the database. No code changes are needed.

What switches over:

- **Storefront.** Products, categories, reviews, settings, couriers and the
  running campaign load from the database. The cache refreshes as soon as the
  dashboard saves a change.
- **Checkout.** Orders go through `place_order()`, which checks prices, stock,
  the coupon and the Easypaisa payment details again before saving. Stock goes down when an order is placed
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
3. In **Dashboard > Settings > Easypaisa account**, enter the account name and
   number. Checkout stays closed until this is filled in.
4. Place an order on the storefront. It appears in **Dashboard > Orders** and
   **Dashboard > Payments**, and the stock for that size goes down.
5. Open **Dashboard > Products**, change a price and save. Reload the product
   page: the new price shows.

## Easypaisa payments

Every order is paid by Easypaisa, in every city. There is no payment gateway:
customers transfer the money themselves.

1. Checkout shows the account name, the number and the exact amount, delivery
   included.
2. The customer sends the money, then enters the transaction ID and uploads a
   screenshot. Screenshots go to the private `payment-proofs` bucket. Only the
   team can open them.
3. The order is saved with payment status **Pending Verification**. The
   database refuses an order without a transaction ID and screenshot, and a
   transaction ID already used by another order.
4. The owner checks the payment in **Dashboard > Payments** or on the order,
   then presses **Approve** (status **Paid**) or **Reject payment** with a
   reason (status **Payment Rejected**). The customer is emailed either way.
5. After a rejection the customer opens the Track order page, reads the reason
   and sends a new transaction ID and screenshot. The owner is emailed.

Payment status is separate from the order status. The database will not move
an Easypaisa order to Confirmed or later until its payment is **Paid**.

Delivery fees by city are in **Settings > Delivery fees by city**. Quetta starts at
Rs. 500. Other cities use the standard fee.

## Notes

- **Admin address.** The dashboard opens at `/admin` on the store's own address,
  for signed-in team members only. Optionally, point `admin.<your domain>` at
  the same Vercel project: that host then shows only the dashboard. If you do,
  add its `/auth/callback` to the Supabase redirect URLs.
- **Database types.** After linking, `npm run db:types` writes generated types
  to `src/lib/supabase/database.types.ts`, if you want typed queries.
- **Keys.** Only the anon key is used, and row level security protects every
  table. Never put the `service_role` key in a `NEXT_PUBLIC_` variable.

## 5. Switch on email

Emails go out through any SMTP account (nodemailer). Add these to `.env` and
to Vercel:

```
SUPABASE_SERVICE_ROLE_KEY=<Project Settings > API Keys > service_role or secret key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<app password>
SMTP_FROM="Candle Lit Studio <you@gmail.com>"
CRON_SECRET=<any long random string>
```

- **Gmail.** Turn on 2-step verification, then create an app password at
  https://myaccount.google.com/apppasswords and use it as `SMTP_PASS`. Gmail
  allows about 500 emails a day. For more, use a provider such as Brevo, Zoho
  or Amazon SES with their SMTP details.
- **Service role key.** Server only. Never give it a `NEXT_PUBLIC_` name.
- **Database.** Run `npx supabase db push --remote` once more to add the email
  log, the unsubscribe links and the new templates.
- **Check it.** Open Dashboard > Messages. The banner turns green when email is

What is sent:

| When | Customer gets | Owner gets |
| --- | --- | --- |
| Order placed | Order received | New order alert, low-stock alerts |
| Payment approved | Payment received | |
| Payment rejected | The reason, and how to send new details | |
| New payment details sent | | Payment to check |
| Confirmed, preparing, packed | One email per step (preparing and packed start switched off) | |
| Dispatched | Courier and tracking ID | |
| Delivered | Delivered note, then a review request 3 days later | |
| Cancelled | Cancellation note | Cancellation alert |
| Contact form | | The message |
| Team member added | The new team member gets an invite with a link to sign in | |
| Newsletter sign-up | Welcome with the WELCOME10 code | |

Switch any email on or off in Dashboard > Messages. Newsletter drafts have a
**Send** button, and every newsletter carries an unsubscribe link. Each email
is listed under **Sent emails** with its status and any error.

The daily job runs through Vercel Cron (`vercel.json`) at 11:00 Pakistan time.
It sends review requests (days set in Settings), cart reminders (hours set
in Settings) and newsletters scheduled for that day. Vercel sends `CRON_SECRET` with it automatically.

Supabase's own sign-in emails (confirm email, reset password) use Supabase's
mail service, which is limited to a few per hour. To send them through the
same account, open Authentication > Emails > SMTP Settings in Supabase and
enter the same SMTP details.

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


## 6. Run the checks

```bash
npm test
```

runs 36 tests: pricing, emails, PDF invoices, and every database rule (checkout,
Easypaisa payments, coupons, stock, cancellations, access rules) against an in-memory copy of the
database built from `supabase/migrations`.
