import { beforeAll, describe, expect, it } from 'vitest'
import { BUYER, OWNER, createDb, easypaisa, orderPayload } from './setup'

let t: Awaited<ReturnType<typeof createDb>>

const place = async (extra: Record<string, unknown> = {}, customer: Record<string, unknown> = {}) =>
  (
    await t.q<{ r: { number: string; accessToken: string; total: number } }>(`select place_order($1::jsonb) r`, [
      orderPayload(extra, customer),
    ])
  )[0].r

const stock = async (variant: string) =>
  (await t.q<{ stock: number }>(`select stock from variants where id = $1`, [variant]))[0].stock

const fails = async (sql: string, params: unknown[] = []) => {
  try {
    await t.q(sql, params)
  } catch (error) {
    return (error as Error).message
  }
  throw new Error('expected an error')
}

beforeAll(async () => {
  t = await createDb()
  // A campaign that is running today, whatever today is
  await t.q(`update campaigns set starts_at = current_date - 1, ends_at = current_date + 5`)
})

describe('checkout', () => {
  it('recomputes prices and takes stock', async () => {
    const before = await stock('p01-220')
    const order = await place(
      {
        lines: [
          { variantId: 'p01-220', qty: 2 },
          { variantId: 'p02-220', qty: 1 },
        ],
      },
      { phone: '03000000001' },
    )
    const row = (
      await t.q<{ subtotal: number; shipping: number; total: number }>(
        `select subtotal, shipping, total from orders where number = $1`,
        [order.number],
      )
    )[0]
    // 2 x 1,850 + chai at 15% off 1,650 = 1,403
    expect(row.subtotal).toBe(5103)
    expect(row.shipping).toBe(0)
    expect(row.total).toBe(5103)
    expect(await stock('p01-220')).toBe(before - 2)
  })

  it('applies a running campaign but never stacks it with the product discount', async () => {
    const r = await t.q<{ id: string; eff: number | null }>(
      `select id, effective_discount(p) eff from products p where id in ('p02', 'p13') order by id`,
    )
    expect(r.find(x => x.id === 'p02')?.eff).toBe(15)
    expect(r.find(x => x.id === 'p13')?.eff).toBe(20)
  })

  it('needs an email address', async () => {
    for (const email of ['', 'not-an-email']) {
      expect(await fails(`select place_order($1::jsonb)`, [orderPayload({}, { phone: '03000000051', email })])).toMatch(
        /INVALID: email/,
      )
    }
  })

  it('refuses more than is in stock', async () => {
    expect(
      await fails(`select place_order($1::jsonb)`, [
        orderPayload({ lines: [{ variantId: 'p01-400', qty: 99 }] }, { phone: '03000000002' }),
      ]),
    ).toMatch(/OUT_OF_STOCK/)
  })

  it('charges city delivery fees', async () => {
    // Quetta costs Rs. 500 out of the box
    await t.q(`insert into shipping_rates (city, area, fee) values ('Quetta', 'Cantt', 0)`)
    const city = await place({}, { city: 'Quetta', area: 'Jinnah Town', phone: '03000000003' })
    const area = await place({}, { city: 'Quetta', area: 'Cantt', phone: '03000000004' })
    const other = await place({}, { city: 'Multan', phone: '03000000005' })
    const ship = async (n: string) =>
      (await t.q<{ shipping: number }>(`select shipping from orders where number = $1`, [n]))[0].shipping
    expect(await ship(city.number)).toBe(500)
    expect(await ship(area.number)).toBe(0)
    expect(await ship(other.number)).toBe(250)
  })

  it('keeps WELCOME10 to first orders', async () => {
    const first = await place({ couponCode: 'welcome10' }, { phone: '03000000006', email: 'new@example.com' })
    expect(first.total).toBeLessThan(1850 + 250)
    expect(
      await fails(`select place_order($1::jsonb)`, [
        orderPayload({ couponCode: 'WELCOME10' }, { phone: '03000000006', email: 'new@example.com' }),
      ]),
    ).toMatch(/first orders only/)
  })

  it('limits a coupon to its categories', async () => {
    await t.q(`insert into coupons (code, type, value, category_slugs) values ('GIFT15', 'percent', 15, '{gift-sets}')`)
    const r = (
      await t.q<{ r: { ok: boolean; message?: string } }>(`select validate_coupon('GIFT15', 1850, $1::jsonb) r`, [
        JSON.stringify([{ variantId: 'p01-220', qty: 1 }]),
      ])
    )[0].r
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/does not apply/)
  })

  it('blocks customers marked Blocked', async () => {
    await t.q(`insert into customer_notes (phone, status) values ('03000000009', 'Blocked')`)
    expect(await fails(`select place_order($1::jsonb)`, [orderPayload({}, { phone: '03000000009' })])).toMatch(
      /BLOCKED/,
    )
  })

  it('limits orders per phone', async () => {
    for (let i = 0; i < 5; i++) await place({}, { phone: '03000000010' })
    expect(await fails(`select place_order($1::jsonb)`, [orderPayload({}, { phone: '03000000010' })])).toMatch(
      /RATE_LIMIT/,
    )
  })
})

describe('colours', () => {
  it('saves the chosen colour and takes stock per size across colours', async () => {
    const before = await stock('p09-s')
    const order = await place(
      {
        lines: [
          { variantId: 'p09-s', colour: 'Ivory', qty: 1 },
          { variantId: 'p09-s', colour: 'Sage', qty: 2 },
        ],
      },
      { phone: '03000000031' },
    )
    const lines = await t.q<{ colour: string; qty: number }>(
      `select colour, qty from order_lines where order_number = $1 order by colour`,
      [order.number],
    )
    expect(lines).toEqual([
      { colour: 'Ivory', qty: 1 },
      { colour: 'Sage', qty: 2 },
    ])
    expect(await stock('p09-s')).toBe(before - 3)
    // Cancelling puts back both colours of the size
    await t.q(`update orders set status = 'Cancelled' where number = $1`, [order.number])
    expect(await stock('p09-s')).toBe(before)
  })

  it('needs one of the product colours, and none for products without colours', async () => {
    const noColour = orderPayload({ lines: [{ variantId: 'p09-s', qty: 1 }] }, { phone: '03000000032' })
    expect(await fails(`select place_order($1::jsonb)`, [noColour])).toMatch(/COLOUR/)
    const unknown = orderPayload(
      { lines: [{ variantId: 'p09-s', colour: 'Purple', qty: 1 }] },
      { phone: '03000000032' },
    )
    expect(await fails(`select place_order($1::jsonb)`, [unknown])).toMatch(/COLOUR/)
    const extra = orderPayload({ lines: [{ variantId: 'p01-220', colour: 'Ivory', qty: 1 }] }, { phone: '03000000032' })
    expect(await fails(`select place_order($1::jsonb)`, [extra])).toMatch(/COLOUR/)
  })

  it('refuses more than the stock of a size, counting every colour', async () => {
    const left = await stock('p09-s')
    const tooMany = orderPayload(
      {
        lines: [
          { variantId: 'p09-s', colour: 'Amber', qty: left },
          { variantId: 'p09-s', colour: 'Ivory', qty: 1 },
        ],
      },
      { phone: '03000000033' },
    )
    expect(await fails(`select place_order($1::jsonb)`, [tooMany])).toMatch(/OUT_OF_STOCK/)
  })
})

describe('Easypaisa payments', () => {
  const statusOf = async (n: string) =>
    (
      await t.q<{ status: string; payment_status: string; payment_method: string }>(
        `select status, payment_status, payment_method from orders where number = $1`,
        [n],
      )
    )[0]

  it('takes every order as Easypaisa waiting for a check, in any city', async () => {
    for (const city of ['Quetta', 'Lahore']) {
      const order = await place({}, { city, phone: city === 'Quetta' ? '03000000021' : '03000000022' })
      expect(await statusOf(order.number)).toMatchObject({
        payment_method: 'Easypaisa',
        payment_status: 'Pending Verification',
        status: 'Pending Confirmation',
      })
    }
  })

  it('needs a transaction ID and a screenshot', async () => {
    const noId = orderPayload({ payment: { ...easypaisa(), reference: '' } }, { phone: '03000000023' })
    expect(await fails(`select place_order($1::jsonb)`, [noId])).toMatch(/transaction ID/)
    const noShot = orderPayload({ payment: { reference: 'TID99999991', proof: '' } }, { phone: '03000000023' })
    expect(await fails(`select place_order($1::jsonb)`, [noShot])).toMatch(/screenshot/)
    const fakeShot = orderPayload(
      { payment: { reference: 'TID99999992', proof: 'checkout/99999999-0000-0000-0000-000000000000.jpg' } },
      { phone: '03000000023' },
    )
    expect(await fails(`select place_order($1::jsonb)`, [fakeShot])).toMatch(/screenshot/)
  })

  it('refuses a transaction ID that already paid for another order', async () => {
    const payment = easypaisa()
    await place({ payment }, { phone: '03000000024' })
    const again = orderPayload(
      { payment: { ...easypaisa(), reference: payment.reference.toLowerCase() } },
      {
        phone: '03000000025',
      },
    )
    expect(await fails(`select place_order($1::jsonb)`, [again])).toMatch(/already used/)
  })

  it('keeps an unpaid order from moving forward until the owner approves', async () => {
    const order = await place({}, { phone: '03000000026' })
    expect(await fails(`update orders set status = 'Confirmed' where number = $1`, [order.number])).toMatch(
      /PAYMENT_UNVERIFIED/,
    )
    await expect(
      t.asRole('authenticated', BUYER, `select admin_review_payment($1, true)`, [order.number]),
    ).rejects.toThrow(/FORBIDDEN/)
    await t.asRole('authenticated', OWNER, `select admin_review_payment($1, true)`, [order.number])
    expect((await statusOf(order.number)).payment_status).toBe('Paid')
    await t.q(`update orders set status = 'Confirmed' where number = $1`, [order.number])
    expect((await statusOf(order.number)).status).toBe('Confirmed')
  })

  it('lets the customer send new details after a rejection', async () => {
    const order = await place({}, { phone: '03000000027' })
    await t.asRole(
      'authenticated',
      OWNER,
      `select admin_review_payment($1, false, 'Amount received was Rs. 500 short')`,
      [order.number],
    )
    const rejected = (
      await t.q<{ payment_status: string; payment_rejection_reason: string }>(
        `select payment_status, payment_rejection_reason from orders where number = $1`,
        [order.number],
      )
    )[0]
    expect(rejected).toMatchObject({
      payment_status: 'Payment Rejected',
      payment_rejection_reason: 'Amount received was Rs. 500 short',
    })
    const fresh = easypaisa()
    expect(
      await fails(`select resubmit_payment($1, '03009999999', null, $2, $3)`, [
        order.number,
        fresh.reference,
        fresh.proof,
      ]),
    ).toMatch(/INVALID/)
    await t.asRole('anon', null, `select resubmit_payment($1, '03000000027', null, $2, $3)`, [
      order.number,
      fresh.reference,
      fresh.proof,
    ])
    expect((await statusOf(order.number)).payment_status).toBe('Pending Verification')
    expect(
      await fails(`select resubmit_payment($1, '03000000027', null, $2, $3)`, [
        order.number,
        'TID12345678',
        fresh.proof,
      ]),
    ).toMatch(/not waiting/)
  })

  it('keeps payment screenshots private', async () => {
    const shots = await t.asRole<{ n: number }>(
      'anon',
      null,
      `select count(*)::int n from storage.objects where bucket_id = 'payment-proofs'`,
    )
    expect(shots[0].n).toBe(0)
  })
})

describe('after checkout', () => {
  it('restocks a cancelled order once and writes the stock history', async () => {
    const order = await place({ lines: [{ variantId: 'p03-220', qty: 2 }] }, { phone: '03000000011' })
    const afterOrder = await stock('p03-220')
    await t.q(`update orders set status = 'Cancelled' where number = $1`, [order.number])
    expect(await stock('p03-220')).toBe(afterOrder + 2)
    await t.q(`update orders set payment_status = 'Paid', status = 'Confirmed' where number = $1`, [order.number])
    await t.q(`update orders set status = 'Cancelled' where number = $1`, [order.number])
    expect(await stock('p03-220')).toBe(afterOrder + 2)
    const history = await t.q<{ reason: string; change: number }>(
      `select reason, change from stock_movements where order_number = $1 order by id`,
      [order.number],
    )
    expect(history.map(h => `${h.reason} ${h.change}`)).toEqual(['Order placed -2', 'Order cancelled 2'])
  })

  it('restocks a returned order', async () => {
    const order = await place({ lines: [{ variantId: 'p03-220', qty: 1 }] }, { phone: '03000000012' })
    const before = await stock('p03-220')
    await t.q(`update orders set status = 'Returned' where number = $1`, [order.number])
    expect(await stock('p03-220')).toBe(before + 1)
  })

  it('lets the customer ask to cancel before dispatch only', async () => {
    const order = await place({}, { phone: '03000000013' })
    expect(
      (
        await t.q<{ n: string }>(`select request_cancellation($1, '03000000013', null, 'Ordered twice') n`, [
          order.number,
        ])
      )[0].n,
    ).toBe(order.number)
    const row = (await t.q<{ status: string }>(`select status from orders where number = $1`, [order.number]))[0]
    expect(row.status).toBe('Cancellation Requested')
    expect(await fails(`select request_cancellation($1, '03009999999')`, [order.number])).toMatch(/INVALID/)
    await t.q(`update orders set payment_status = 'Paid', status = 'Dispatched' where number = $1`, [order.number])
    expect(await fails(`select request_cancellation($1, '03000000013')`, [order.number])).toMatch(/TOO_LATE/)
  })

  it('edits an order and moves the stock with it', async () => {
    const order = await place({ lines: [{ variantId: 'p01-220', qty: 1 }] }, { phone: '03000000014' })
    const rose = await stock('p01-220')
    const chai = await stock('p02-220')
    await t.q(`update auth.ctx set uid = $1, email = $2`, [OWNER.id, OWNER.email])
    await t.db.query(`select admin_edit_order($1, $2::jsonb, 200, 0, 'Swapped on WhatsApp')`, [
      order.number,
      JSON.stringify([{ variantId: 'p02-220', qty: 2 }]),
    ])
    expect(await stock('p01-220')).toBe(rose + 1)
    expect(await stock('p02-220')).toBe(chai - 2)
    const row = (
      await t.q<{ subtotal: number; total: number }>(`select subtotal, total from orders where number = $1`, [
        order.number,
      ])
    )[0]
    expect(row.subtotal).toBe(2 * 1403)
    expect(row.total).toBe(2 * 1403 + 200)
  })

  it('gives every order an invoice number', async () => {
    const order = await place({}, { phone: '03000000015' })
    const json = (
      await t.q<{ r: { invoiceNumber: number } }>(`select get_order($1, $2::uuid) r`, [order.number, order.accessToken])
    )[0].r
    expect(json.invoiceNumber).toBeGreaterThan(1000)
  })

  it('remembers carts and marks them recovered', async () => {
    const cart = '33333333-3333-3333-3333-333333333333'
    await t.q(`select save_cart($1::uuid, 'cart@example.com', 'Cart Person', null, $2::jsonb, 1850)`, [
      cart,
      JSON.stringify([{ productId: 'p01', variantId: 'p01-220', qty: 1 }]),
    ])
    expect((await t.q<{ items: unknown[] }>(`select get_cart($1::uuid) items`, [cart]))[0].items).toHaveLength(1)
    await place({ cartId: cart }, { phone: '03000000016', email: 'cart@example.com' })
    expect((await t.q<{ items: unknown }>(`select get_cart($1::uuid) items`, [cart]))[0].items).toBeNull()
  })
})

describe('reviews', () => {
  it('sends a review back to moderation after three reports', async () => {
    await t.q(`select report_review('r1', 'spam')`)
    await t.q(`select report_review('r1', 'rude')`)
    await t.q(`select report_review('r1', 'fake')`)
    const r = (await t.q<{ status: string; reports: number }>(`select status, reports from reviews where id = 'r1'`))[0]
    expect(r).toEqual({ status: 'Pending', reports: 3 })
  })
})

describe('row level security', () => {
  it('hides private tables from visitors', async () => {
    for (const table of [
      'coupons',
      'orders',
      'customer_notes',
      'stock_movements',
      'carts',
      'email_log',
      'whatsapp_log',
      'team_members',
    ]) {
      const rows = await t.asRole<{ n: number }>('anon', null, `select count(*)::int n from ${table}`)
      expect(rows[0].n, table).toBe(0)
    }
  })

  it('shows public content', async () => {
    const products = await t.asRole<{ n: number }>('anon', null, `select count(*)::int n from products`)
    expect(products[0].n).toBeGreaterThan(5)
    const content = await t.asRole<{ n: number }>('anon', null, `select count(*)::int n from site_content`)
    expect(content[0].n).toBeGreaterThan(0)
  })

  it('stops customers editing the shop', async () => {
    const rows = await t.asRole('authenticated', BUYER, `update store_settings set shipping_fee = 0 returning id`)
    expect(rows).toHaveLength(0)
    await expect(t.asRole('authenticated', BUYER, `select adjust_stock('p01-220', 999, 'hack')`)).rejects.toThrow(
      /FORBIDDEN/,
    )
  })

  it('lets the administrator adjust stock with a reason', async () => {
    await t.asRole('authenticated', OWNER, `select adjust_stock('p01-220', 40, 'New batch poured')`)
    expect(await stock('p01-220')).toBe(40)
    const last = (
      await t.q<{ reason: string }>(
        `select reason from stock_movements where variant_id = 'p01-220' order by id desc limit 1`,
      )
    )[0]
    expect(last.reason).toBe('New batch poured')
  })
})

describe('team and dashboard access', () => {
  const MANAGER = { id: '33333333-3333-3333-3333-333333333333', email: 'payments@example.com' }

  it('links a team member to the account that already uses their email', async () => {
    await t.q(`insert into auth.users (id, email) values ($1, $2)`, [MANAGER.id, MANAGER.email])
    await t.asRole(
      'authenticated',
      OWNER,
      `insert into team_members (name, email, role, modules) values ('Pay Checker', $1, 'Manager', '{COD payments}')`,
      [MANAGER.email],
    )
    const row = (
      await t.q<{ user_id: string }>(`select user_id from team_members where email = $1`, [MANAGER.email])
    )[0]
    expect(row.user_id).toBe(MANAGER.id)
  })

  it('lets a Payments manager approve payments under either module name', async () => {
    const order = await place({}, { phone: '03000000041' })
    await t.asRole('authenticated', MANAGER, `select admin_review_payment($1, true)`, [order.number])
    const row = (
      await t.q<{ payment_status: string }>(`select payment_status from orders where number = $1`, [order.number])
    )[0]
    expect(row.payment_status).toBe('Paid')
    await t.q(`update team_members set modules = '{Payments}' where email = $1`, [MANAGER.email])
    const seen = await t.asRole<{ n: number }>('authenticated', MANAGER, `select count(*)::int n from orders`)
    expect(seen[0].n).toBeGreaterThan(0)
  })

  it('lets staff mark an inbox message as handled with an upsert', async () => {
    const [m] = await t.q<{ id: string }>(
      `insert into contact_messages (name, contact, message) values ('Rabia', '03001112222', 'Do you make wedding favours?') returning id`,
    )
    const saved = await t.asRole<{ handled: boolean }>(
      'authenticated',
      OWNER,
      `insert into contact_messages (id, name, contact, message, handled) values ($1, 'Rabia', '03001112222', 'Do you make wedding favours?', true)
       on conflict (id) do update set handled = excluded.handled returning handled`,
      [m.id],
    )
    expect(saved[0].handled).toBe(true)
  })
})
