'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAdmin } from '../AdminData'
import { card, dateTime, input } from '../ui'
import { adminOrderMessages, adminResendEmail } from '@/lib/actions/admin'

const emailChoices: [string, string][] = [
  ['e-confirm', 'Order received'],
  ['e-confirmed', 'Order confirmed'],
  ['e-dispatch', 'Dispatched, with tracking'],
  ['e-order-delivered', 'Delivered'],
  ['e-delivered', 'Review request'],
  ['e-cancel', 'Cancelled'],
]

type MessageLog = Awaited<ReturnType<typeof adminOrderMessages>>

/** Emails this order has sent, with a resend button */
export default function OrderMessages({ number, hasEmail }: { number: string; hasEmail: boolean }) {
  const { live, templates } = useAdmin()
  const [log, setLog] = useState<MessageLog | null>(null)
  const [choice, setChoice] = useState(emailChoices[0][0])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (live) adminOrderMessages(number).then(setLog)
  }, [live, number])

  if (!live) return null
  const name = (id: string) => templates.find(t => t.id === id)?.name ?? id

  const resend = async () => {
    setSending(true)
    const result = await adminResendEmail(number, choice)
    setSending(false)
    if (result.ok) {
      toast.success('Email sent')
      adminOrderMessages(number).then(setLog)
    } else toast.error(result.error)
  }

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="msg-h">
      <h2 id="msg-h" className="text-2xl">
        Emails sent
      </h2>
      {log === null ? (
        <p className="mt-3 text-umber">Loading…</p>
      ) : !log.ok ? (
        <p className="mt-3 text-wine">{log.error}</p>
      ) : log.data.length === 0 ? (
        <p className="mt-3 text-umber">No emails sent yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {log.data.map((m, i) => (
            <li key={m.at + i} className="text-sm">
              <span className="font-medium">{name(m.templateId)}</span>{' '}
              <span className="text-umber">{dateTime(m.at)}</span>
              <span className={clsx('ml-2', m.status === 'sent' ? 'text-sage' : 'text-wine')}>{m.status}</span>
              {m.error && <span className="block text-wine">{m.error}</span>}
            </li>
          ))}
        </ul>
      )}
      {hasEmail ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={choice}
            onChange={e => setChoice(e.target.value)}
            aria-label="Email to send"
            className={`${input} min-w-0 flex-1`}
          >
            {emailChoices.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <button type="button" disabled={sending} onClick={resend} className="btn-outline min-h-11 px-4 text-sm">
            {sending ? 'Sending…' : 'Send again'}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-umber">The customer gave no email address. Use WhatsApp or a call instead.</p>
      )}
    </section>
  )
}
