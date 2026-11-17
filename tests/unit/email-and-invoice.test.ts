import { describe, expect, it } from 'vitest'
import { fillText, orderDetails, renderEmail } from '@/lib/email/render'
import { buildInvoicePdf } from '@/lib/invoice'
import { formatPKR } from '@/lib/pricing'
import { seedShop } from '@/data/admin-seed'
import { buildOrders } from '@/data/admin'

describe('email rendering', () => {
  it('fills placeholders and leaves unknown ones empty', () => {
    expect(
      fillText('Hi {{customer_name}}, {{nope}}order {{order_number}}', {
        customer_name: 'Sara',
        order_number: 'CND-1',
      }),
    ).toBe('Hi Sara, order CND-1')
  })

  it('escapes customer text in the HTML', () => {
    const mail = renderEmail({
      subject: 'Order {{order_number}}',
      body: 'Note: {{message}}',
      values: { order_number: 'CND-1', message: '<script>alert(1)</script>' },
      storeName: 'Candle Lit Studio',
      footer: 'Quetta',
    })
    expect(mail.subject).toBe('Order CND-1')
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('cid:logo@candlelitstudio')
  })

  it('shows the order table with the amount to pay', () => {
    const details = orderDetails(
      [{ name: 'Desi Gulab', variant: '220 g', qty: 2, unitPrice: 1850 }],
      { subtotal: 3700, discount: 0, shipping: 250, total: 3950 },
      formatPKR,
    )
    expect(details.text).toContain('Total: Rs.')
    expect(details.html).toContain('3,950')
    // Older cash orders keep their wording
    const cash = orderDetails([], { subtotal: 0, discount: 0, shipping: 0, total: 0 }, formatPKR, 'Pay on delivery')
    expect(cash.text).toContain('Pay on delivery: Rs.')
  })
})

describe('PDF invoice', () => {
  it('builds a PDF for an order and a packing slip', async () => {
    const order = buildOrders(Date.now())[0]
    const settings = seedShop().settings
    const invoice = await buildInvoicePdf({ ...order, invoiceNumber: 1001 }, settings, 'invoice')
    const slip = await buildInvoicePdf(order, settings, 'slip')
    expect(new TextDecoder().decode(invoice.slice(0, 5))).toBe('%PDF-')
    expect(invoice.length).toBeGreaterThan(1000)
    expect(slip.length).toBeGreaterThan(1000)
  })
})
