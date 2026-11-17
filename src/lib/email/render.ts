import { siteUrl } from '@/lib/supabase/config'
import { LOGO_CID } from './logo'

// candle-lit-studio.vercel.app, shown without https://
const siteLabel = siteUrl.replace(/^https?:\/\//, '')

// Turns a saved template (plain text with {{placeholders}}) into a branded
// HTML email and a plain-text copy.

export type EmailValues = Record<string, string | undefined> & {
  /** HTML table of the order lines, filled into {{order_details}} in the HTML copy */
  order_details_html?: string
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Placeholders a template may use, with the example shown in the editor preview */
export const placeholders: [string, string][] = [
  ['customer_name', 'Sarah'],
  ['customer_phone', '03001234567'],
  ['order_number', 'CND-1024'],
  ['order_total', 'Rs. 3,503'],
  ['order_details', 'Desi Gulab, 220 g x 1: Rs. 1,850'],
  ['discount', 'Rs. 0'],
  ['delivery_address', 'House 12, Street 8, DHA Phase 5, Lahore'],
  ['courier', 'TCS'],
  ['tracking_id', '779812345601'],
  ['tracking_url', 'https://www.tcsexpress.com/track/'],
  ['product_name', 'Desi Gulab, 220 g'],
  ['stock_left', '3'],
  ['customer_contact', '0300 1234567'],
  ['message', 'Do you make custom scents for weddings?'],
  ['payment_method', 'Easypaisa, transaction ID 41234567890'],
  ['payment_note', 'Total Rs. 3,503, paid by Easypaisa. We are checking your payment.'],
  ['cancel_payment_note', 'If your Easypaisa payment reached us, we will contact you to return it.'],
  ['transaction_id', '41234567890'],
  ['review_links', 'Desi Gulab: https://candle-lit-studio.vercel.app/products/desi-gulab#reviews'],
]

export const fillText = (text: string, values: EmailValues) =>
  text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? '')

const fillHtml = (text: string, values: EmailValues) =>
  esc(text)
    .replace(/\{\{order_details\}\}/g, values.order_details_html ?? esc(values.order_details ?? ''))
    .replace(/\{\{(\w+)\}\}/g, (_match, key: string) => esc(values[key] ?? ''))
    // Bare links become clickable
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#A9692F">$1</a>')

export function renderEmail({
  subject,
  body,
  values,
  storeName,
  footer,
  unsubscribeUrl,
  button,
}: {
  subject: string
  body: string
  values: EmailValues
  storeName: string
  footer: string
  unsubscribeUrl?: string
  button?: { label: string; href: string }
}) {
  const filledSubject = fillText(subject, values)
  const paragraphs = fillHtml(body, values)
    .split(/\n{2,}/)
    .map(p =>
      p.includes('<table')
        ? p
        : `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2E1F17">${p.replace(/\n/g, '<br>')}</p>`,
    )
    .join('')

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(filledSubject)}</title></head>
<body style="margin:0;padding:0;background:#F7F1E6;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E6;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FCF9F3;border:1px solid #D9CBB3;border-radius:16px;overflow:hidden">
<tr><td align="center" style="background:#2E1F17;padding:24px">
<a href="${siteUrl}" style="text-decoration:none"><img src="cid:${LOGO_CID}" width="72" height="72" alt="${esc(storeName)}" style="display:block;margin:0 auto;border-radius:50%;border:0"></a>
<p style="margin:12px 0 0;font-family:Georgia,serif;font-style:italic;font-size:22px"><a href="${siteUrl}" style="color:#F7F1E6;text-decoration:none">${esc(storeName)}</a></p>
</td></tr>
<tr><td style="padding:28px 28px 12px">${paragraphs}
${button ? `<p style="margin:8px 0 20px"><a href="${esc(button.href)}" style="display:inline-block;background:#2E1F17;color:#F7F1E6;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px">${esc(button.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #EADFCB;font-size:13px;line-height:1.5;color:#6F5546">
${esc(footer)}<br><a href="${siteUrl}" style="color:#A9692F">${esc(siteLabel)}</a>${unsubscribeUrl ? `<br><a href="${esc(unsubscribeUrl)}" style="color:#6F5546">Unsubscribe</a>` : ''}
</td></tr>
</table></td></tr></table></body></html>`

  const text = [
    fillText(body, values),
    button ? `${button.label}: ${button.href}` : '',
    `--\n${footer}\n${siteUrl}`,
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return { subject: filledSubject, html, text }
}

/** Order lines as an HTML table and as text */
export function orderDetails(
  lines: { name: string; variant: string; qty: number; unitPrice: number }[],
  totals: {
    subtotal: number
    discount: number
    shipping: number
    total: number
  },
  format: (n: number) => string,
  /** Label of the last line, for example Pay on delivery for old cash orders */
  totalLabel = 'Total',
) {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:6px 0;font-size:14px;color:#6F5546">${esc(label)}</td><td align="right" style="padding:6px 0;font-size:14px;color:#2E1F17;${strong ? 'font-weight:bold' : ''}">${esc(value)}</td></tr>`
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-top:1px solid #EADFCB;border-bottom:1px solid #EADFCB">
${lines.map(l => row(`${l.name}, ${l.variant} x ${l.qty}`, format(l.unitPrice * l.qty))).join('')}
${row('Subtotal', format(totals.subtotal))}
${totals.discount ? row('Discount', `- ${format(totals.discount)}`) : ''}
${row('Delivery', totals.shipping ? format(totals.shipping) : 'Free')}
${row(totalLabel, format(totals.total), true)}
</table>`
  const text = [
    ...lines.map(l => `${l.name}, ${l.variant} x ${l.qty}: ${format(l.unitPrice * l.qty)}`),
    `Subtotal: ${format(totals.subtotal)}`,
    totals.discount ? `Discount: -${format(totals.discount)}` : '',
    `Delivery: ${totals.shipping ? format(totals.shipping) : 'Free'}`,
    `${totalLabel}: ${format(totals.total)}`,
  ]
    .filter(Boolean)
    .join('\n')
  return { html, text }
}
