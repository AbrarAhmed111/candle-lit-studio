import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/*
 * Boots an in-memory Postgres, adds stand-ins for the parts Supabase
 * provides (auth, storage, roles), then runs every migration and the seed.
 */

const root = join(__dirname, '..', '..')

export const OWNER = { id: '11111111-1111-1111-1111-111111111111', email: 'owner@example.com' }
export const BUYER = { id: '22222222-2222-2222-2222-222222222222', email: 'buyer@example.com' }

export async function createDb() {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create table auth.ctx (uid uuid, email text);
    insert into auth.ctx values (null, null);
    create function auth.uid() returns uuid language sql stable as $$ select uid from auth.ctx $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', email) from auth.ctx $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  `)
  const dir = join(root, 'supabase', 'migrations')
  for (const file of readdirSync(dir).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), 'utf8'))
    } catch (error) {
      throw new Error(`${file}: ${(error as Error).message}`)
    }
  }
  await db.exec(readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8'))
  // The shop's Easypaisa account, and screenshots the test orders point to
  await db.exec(
    `update public.store_settings set easypaisa_name = 'Candle Lit Studio', easypaisa_number = '03001234567'`,
  )
  await db.exec(
    `insert into storage.objects (bucket_id, name) select 'payment-proofs', 'checkout/' || lpad(n::text, 8, '0') || '-0000-0000-0000-000000000000.jpg' from generate_series(1, 300) n`,
  )
  // The seed's administrator is whoever ran db:seed; tests use their own
  await db.exec(
    `insert into public.team_members (name, email, role) values ('Owner', '${OWNER.email}', 'Administrator') on conflict do nothing`,
  )
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
    ('${OWNER.id}', '${OWNER.email}', '{"full_name":"Store Owner"}'),
    ('${BUYER.id}', '${BUYER.email}', '{"full_name":"Test Buyer"}')`)
  await db.exec(`
    grant usage on schema public, auth to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
    grant all on all sequences in schema public to anon, authenticated;
    grant select on auth.ctx to anon, authenticated;
    -- Supabase keeps row level security on for stored files
    grant usage on schema storage to anon, authenticated;
    grant select, insert on storage.objects to anon, authenticated;
    alter table storage.objects enable row level security;
  `)

  const as = async (who: { id: string; email: string } | null) => {
    await db.exec('reset role')
    await db.exec(
      `update auth.ctx set uid = ${who ? `'${who.id}'` : 'null'}, email = ${who ? `'${who.email}'` : 'null'}`,
    )
  }

  return {
    db,
    /** Runs SQL as the database owner (like a security definer function) */
    async q<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      await as(null)
      return (await db.query<T>(sql, params)).rows
    },
    /** Runs SQL through row level security as a visitor, customer or team member */
    async asRole<T = Record<string, unknown>>(
      role: 'anon' | 'authenticated',
      who: { id: string; email: string } | null,
      sql: string,
      params: unknown[] = [],
    ) {
      await as(who)
      await db.exec(`set role ${role}`)
      try {
        return (await db.query<T>(sql, params)).rows
      } finally {
        await db.exec('reset role')
      }
    },
  }
}

let payments = 0

/** Details of an Easypaisa payment: a new transaction ID and an uploaded screenshot each time */
export const easypaisa = () => {
  payments += 1
  return {
    reference: `TID${String(payments).padStart(8, '0')}`,
    proof: `checkout/${String(payments).padStart(8, '0')}-0000-0000-0000-000000000000.jpg`,
  }
}

export const orderPayload = (extra: Record<string, unknown> = {}, customer: Record<string, unknown> = {}) =>
  JSON.stringify({
    payment: easypaisa(),
    customer: {
      name: 'Test Buyer',
      phone: '03001234567',
      email: 'buyer@example.com',
      city: 'Lahore',
      area: 'DHA',
      address: 'House 1, Street 2',
      ...customer,
    },
    lines: [{ variantId: 'p01-220', qty: 1 }],
    ...extra,
  })
