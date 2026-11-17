import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { AdminOrder } from '@/data/admin'
import type { Settings } from '@/components/admin/AdminData'
import { formatPKR } from '@/lib/pricing'

// A4 invoice or packing slip as a PDF, built in the browser.

const espresso = rgb(0.18, 0.12, 0.09)
const umber = rgb(0.44, 0.33, 0.27)
const caramel = rgb(0.66, 0.41, 0.18)
const line = rgb(0.85, 0.8, 0.7)

// The built-in PDF fonts only cover Western European characters
const safe = (text: string) =>
  text
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

const money = (n: number) => safe(formatPKR(n))
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  })

/** Splits text into lines that fit the width */
const wrap = (text: string, font: PDFFont, size: number, width: number) => {
  const words = safe(text).split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > width && current) {
      lines.push(current)
      current = word
    } else current = next
  }
  if (current) lines.push(current)
  return lines
}

export async function buildInvoicePdf(order: AdminOrder, settings: Settings, kind: 'invoice' | 'slip' = 'invoice') {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${kind === 'invoice' ? 'Invoice' : 'Packing slip'} ${order.number}`)
  pdf.setAuthor(settings.name)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic)

  let page: PDFPage = pdf.addPage([595.28, 841.89])
  const margin = 48
  const right = 595.28 - margin
  let y = 841.89 - margin

  const text = (value: string, x: number, size = 10, font = regular, color = espresso) =>
    page.drawText(safe(value), { x, y, size, font, color })
  const textRight = (value: string, x: number, size = 10, font = regular, color = espresso) =>
    page.drawText(safe(value), { x: x - font.widthOfTextAtSize(safe(value), size), y, size, font, color })
  const rule = () => page.drawLine({ start: { x: margin, y }, end: { x: right, y }, thickness: 0.75, color: line })
  const ensure = (space: number) => {
    if (y - space < margin + 40) {
      page = pdf.addPage([595.28, 841.89])
      y = 841.89 - margin
    }
  }

  // Heading
  text(settings.name, margin, 24, serif)
  textRight(kind === 'invoice' ? 'INVOICE' : 'PACKING SLIP', right, 14, bold, caramel)
  y -= 18
  for (const l of wrap(`${settings.address}  |  ${settings.phone}  |  ${settings.email}`, regular, 9, 330)) {
    text(l, margin, 9, regular, umber)
    y -= 12
  }
  y -= 10

  // Order facts
  const facts: [string, string][] = [
    ['Order', order.number],
    ['Date', date(order.placedAt)],
    ...(kind === 'invoice' && order.invoiceNumber
      ? ([['Invoice', `${settings.invoicePrefix}${order.invoiceNumber}`]] as [string, string][])
      : []),
    ['Payment', order.paymentMethod === 'Easypaisa' ? 'Easypaisa' : 'Cash on delivery'],
  ]
  const factsTop = y
  for (const [label, value] of facts) {
    text(label, 360, 9, regular, umber)
    textRight(value, right, 10, bold)
    y -= 15
  }

  // Customer
  y = factsTop
  text(kind === 'invoice' ? 'Bill and deliver to' : 'Deliver to', margin, 9, regular, umber)
  y -= 15
  const c = order.customer
  const address = [
    c.name,
    c.phone,
    c.address,
    [c.area, c.city, c.postalCode].filter(Boolean).join(', '),
    c.landmark ? `Near ${c.landmark}` : '',
  ].filter(Boolean)
  for (const part of address) {
    for (const l of wrap(part, part === c.name ? bold : regular, 10, 280)) {
      text(l, margin, 10, part === c.name ? bold : regular)
      y -= 14
    }
  }
  y = Math.min(y, factsTop - facts.length * 15) - 16

  // Lines
  rule()
  y -= 16
  text('Item', margin, 9, bold, umber)
  textRight('Qty', 360, 9, bold, umber)
  if (kind === 'invoice') {
    textRight('Price', 450, 9, bold, umber)
    textRight('Amount', right, 9, bold, umber)
  }
  y -= 8
  rule()
  y -= 18
  for (const l of order.lines) {
    ensure(30)
    const name = wrap(`${l.name}, ${l.variant}${l.colour ? `, ${l.colour}` : ''}`, regular, 10, 280)
    text(name[0], margin, 10)
    textRight(String(l.qty), 360, 10)
    if (kind === 'invoice') {
      textRight(money(l.unitPrice), 450, 10)
      textRight(money(l.unitPrice * l.qty), right, 10)
    }
    for (const extra of name.slice(1)) {
      y -= 13
      text(extra, margin, 10)
    }
    if (kind === 'invoice' && l.unitPrice < l.originalPrice) {
      y -= 12
      text(`Was ${money(l.originalPrice)}`, margin, 8, regular, umber)
    }
    y -= 20
  }
  rule()
  y -= 20

  if (kind === 'invoice') {
    const totals: [string, string, boolean?][] = [
      ['Subtotal', money(order.subtotal)],
      ...(order.couponDiscount
        ? ([[`Coupon ${order.couponCode ?? ''}`.trim(), `- ${money(order.couponDiscount)}`]] as [string, string][])
        : []),
      ['Delivery', order.shipping ? money(order.shipping) : 'Free'],
      [
        order.paymentMethod === 'Easypaisa' ? 'Total, paid by Easypaisa' : 'Amount to pay on delivery',
        money(order.total),
        true,
      ],
    ]
    for (const [label, value, strong] of totals) {
      ensure(24)
      text(label, 330, strong ? 11 : 10, strong ? bold : regular, strong ? espresso : umber)
      textRight(value, right, strong ? 12 : 10, strong ? bold : regular)
      y -= strong ? 22 : 16
    }
  } else {
    ensure(60)
    text(`Items in this parcel: ${order.lines.reduce((n, l) => n + l.qty, 0)}`, margin, 11, bold)
    y -= 18
    text(
      order.paymentMethod === 'Easypaisa'
        ? `Paid by Easypaisa (${money(order.total)}). Collect nothing at the door.`
        : `Collect ${money(order.total)} in cash on delivery.`,
      margin,
      11,
    )
    y -= 18
    if (c.notes) {
      for (const l of wrap(`Customer note: ${c.notes}`, regular, 10, right - margin)) {
        text(l, margin, 10, regular, umber)
        y -= 14
      }
    }
  }

  // Footer on every page
  for (const p of pdf.getPages()) {
    p.drawText(safe(`Thank you for shopping with ${settings.name}.`), {
      x: margin,
      y: margin - 10,
      size: 9,
      font: serif,
      color: umber,
    })
  }

  return pdf.save()
}

/** Builds the PDF and saves it to the device */
export async function downloadInvoice(order: AdminOrder, settings: Settings, kind: 'invoice' | 'slip' = 'invoice') {
  const bytes = await buildInvoicePdf(order, settings, kind)
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${kind === 'invoice' ? 'Invoice' : 'Packing-slip'}-${order.number}.pdf`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
