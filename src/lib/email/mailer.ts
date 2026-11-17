import nodemailer, { type Transporter } from 'nodemailer'
import { LOGO_CID, logoPng } from './logo'

// SMTP settings come from the environment. Any provider works: Gmail (with
// an app password), Zoho, Brevo, Hostinger, Amazon SES and others.

const env = (name: string) => process.env[name]?.trim() ?? ''

export const emailConfigured = () => Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'))

/** "Candle Lit Studio <hello@candlelitstudio.pk>" */
export const fromAddress = (storeName: string) => {
  const from = env('SMTP_FROM') || env('SMTP_USER')
  return from.includes('<') ? from : `${storeName} <${from}>`
}

let transporter: Transporter | null = null

const transport = () => {
  if (transporter) return transporter
  const port = Number(env('SMTP_PORT') || 465)
  transporter = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    // Port 465 uses TLS from the start; 587 upgrades with STARTTLS
    secure: env('SMTP_SECURE') ? env('SMTP_SECURE') === 'true' : port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  return transporter
}

export type Mail = { to: string; subject: string; html: string; text: string; from: string; replyTo?: string }

/** Sends one email, trying twice. Resolves with the error text instead of throwing. */
export async function deliver(
  mail: Mail,
): Promise<{ ok: true; attempts: number } | { ok: false; error: string; attempts: number }> {
  if (!emailConfigured()) return { ok: false, error: 'SMTP is not configured', attempts: 0 }
  let last = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await transport().sendMail({
        ...mail,
        // The logo travels inside the email instead of being loaded from the site
        attachments: [
          { filename: 'logo.png', content: logoPng, encoding: 'base64', cid: LOGO_CID, contentDisposition: 'inline' },
        ],
      })
      return { ok: true, attempts: attempt }
    } catch (error) {
      last = (error as Error).message
      // Bad login or address: retrying will not help
      if (/auth|invalid|recipient|535|550|553/i.test(last)) return { ok: false, error: last, attempts: attempt }
    }
  }
  return { ok: false, error: last, attempts: 2 }
}
