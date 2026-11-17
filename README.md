# Candle Lit Studio

Online store and back office for Candle Lit Studio, a candle maker in Quetta selling hand-poured candles across
Pakistan.

Customers browse, check out and pay by Easypaisa. The owner runs the shop from a dashboard: checking payments,
packing and dispatching orders, managing products, discounts and website text. No technical knowledge is needed.

## Features

### Storefront

- Shop with filters, collections, product pages with photos, sizes, colours, reviews and stock.
- Products can come in several colours. The customer picks one with colour swatches, and the colour follows the
  item through the cart, the order, emails and invoices.
- Cart and wishlist, saved in the browser. Reminder emails for carts left at checkout.
- Guest checkout. Delivery fee by city and area: Quetta Rs. 500, other cities the standard fee, free above a set
  amount.
- **Easypaisa payment** for every order. Checkout shows the account, the exact amount, then takes the transaction ID
  and a payment screenshot.
- Order confirmation page, order tracking by order number and phone, and cancellation requests before dispatch.
- After a rejected payment, the customer sends new payment details from the tracking page.
- Accounts with Google or email sign-in: profile, saved addresses, order history and reorder.
- Reviews with photos, newsletter sign-up, contact form, FAQ, policies, sitemap and SEO tags.

### Dashboard (`/admin`)

- **Overview** with a "Today" list: payments to check, orders to confirm, parcels to send.
- **Payments**: check each Easypaisa transfer against the screenshot, then approve or reject it with a reason.
- **Orders**: one clear next step per order, dispatch with courier and tracking ID, edit items, cancel, invoices and
  packing slips (PDF or print), internal notes, full history, undo.
- Manual orders for phone and WhatsApp sales.
- **Products**: sizes, prices, colours (with ready-made swatches), stock with history, photos, bulk edits and
  spreadsheet import. Every colour of a size shares its stock. **Categories** too.
- **Discounts**: coupons with limits, and timed sales.
- **Customers** with notes, VIP and blocked status.
- **Reviews** moderation, **Messages** (email templates and sent log), **Newsletter** with scheduling.
- **Website** text editor: hero, about page and policies.
- **Reports**, **Activity** log, **Team** with per-module access for managers, and **Settings**.

## Tech stack

| Part | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| State | Redux Toolkit (cart, wishlist) |
| Database, auth, files | Supabase: Postgres with row level security, Google and email sign-in, storage |
| Email | Nodemailer over any SMTP account |
| Scheduled jobs | Vercel Cron |
| PDFs, spreadsheets | pdf-lib, read-excel-file |
| Tests | Vitest, PGlite (in-memory Postgres) |

## Getting started

You need Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 for the store and http://localhost:3000/admin for the dashboard.

With the Supabase keys left empty, the site runs on built-in demo data so you can look around. Fill them in to use
the real database.

## Environment variables

All are listed in `.env.example`.

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `NEXT_PUBLIC_SITE_URL` | The store's public address, used in emails and sign-in links |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Used for emails and the daily job |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email account. Gmail: `smtp.gmail.com`, port 465, an app password |
| `CRON_SECRET` | Any long random string. Protects the daily job |

Never give the service role key a `NEXT_PUBLIC_` name.

## Database setup

The full guide, with Google sign-in and email, is in
[documents/supabase-setup.md](documents/supabase-setup.md). In short:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --remote --include-seed
```

The seed loads the catalogue, coupons, settings and email templates, and makes one administrator. Rebuild it with
your own administrator email before pushing:

```bash
OWNER_EMAIL=you@example.com npm run db:seed
```

After the first push, run `npx supabase db push --remote` whenever a new file appears in `supabase/migrations/`.

Then, in the dashboard:

1. **Settings > Easypaisa account**: enter the account name and number. Checkout stays closed until this is set.
2. **Settings > Delivery fees by city**: Quetta starts at Rs. 500. Change it or add other cities here.

## How payments work

Every order is paid by Easypaisa, in every city. There is no payment gateway: customers transfer the money
themselves and the owner checks it.

1. Checkout shows the Easypaisa account and the exact amount, delivery included.
2. The customer pays, then enters the transaction ID and uploads a screenshot (stored privately).
3. The order is saved as **Pending Verification**. The database refuses missing details and transaction IDs used
   before.
4. The owner approves (**Paid**) or rejects with a reason (**Payment Rejected**). The customer is emailed.
5. A rejected customer sends new details from the tracking page. The owner is emailed.

Payment status is kept separate from the order status. An order cannot be confirmed, packed or dispatched until
its payment is **Paid**. The database enforces this, not only the screens.

Orders placed before Easypaisa may be cash on delivery. The Payments page keeps tracking those until they are
settled.

## Deploying

The site is built for Vercel.

1. Import the repository in Vercel.
2. Add every variable from `.env.example` under **Settings > Environment Variables**. Set `NEXT_PUBLIC_SITE_URL`
   to the live address.
3. In Supabase, add `https://<your domain>/auth/callback` to **Authentication > URL Configuration > Redirect URLs**.

`vercel.json` runs the daily job at 11:00 Pakistan time. It sends review requests, cart reminders and scheduled
newsletters.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Check the code with ESLint |
| `npm run format` | Format the code with Prettier |
| `npm test` | Run all tests |
| `npm run test:db` | Run only the database tests |
| `npm run db:seed` | Rebuild `supabase/seed.sql` from the demo data |
| `npm run db:types` | Generate TypeScript types from the linked database |

The tests cover pricing, emails, PDF invoices and every database rule: checkout, Easypaisa payments, coupons,
stock, colours, cancellations and access. Database tests run the real migrations in an in-memory Postgres, so they need no
Supabase project.

## Project structure

```
src/
  app/
    (store)/          Storefront pages: shop, product, cart, checkout, account, tracking
    admin/            Dashboard pages
    api/cron/         Daily job for emails
    auth/callback/    Sign-in return
  components/
    store/            Storefront pieces (checkout payment, order details, cart)
    admin/            Dashboard pieces, grouped by page (order/, payments/, discounts/, website/)
    account/          Customer account pieces
    ui/               Shared form controls
  lib/
    actions/          Server actions: auth, store, account, admin/
    email/            Mailer, templates, order emails, scheduled jobs
    supabase/         Clients, config, row mappers
    catalog/          Loads the live catalogue for the storefront
    payments.ts       Easypaisa payment rules
    pricing.ts        Totals, delivery fees, coupons
    invoice.ts        PDF invoices and packing slips
  data/               Demo catalogue and default text
  store/              Redux cart and wishlist
  middleware.ts       Session refresh and dashboard protection
supabase/
  migrations/         Tables, security rules, functions, storage
  seed.sql            Starting data (built by scripts/generate-seed.ts)
tests/
  db/                 Database rules against the real migrations
  unit/               Pricing, emails, invoices
documents/            Setup guide
```

## Code conventions

- TypeScript strict mode, no unused variables. Prettier with a 120-character line.
- No source file goes over 500 lines. Large pages are split into components next to them.
- Shared pieces live in `components/ui` and `components/admin/ui.tsx`.
- Every rule that protects money or stock lives in the database (`supabase/migrations`), and the screens repeat it
  for a better experience.
