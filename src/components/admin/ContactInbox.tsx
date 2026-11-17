'use client'

import { useState } from 'react'
import { Mail, Phone } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import clsx from 'clsx'
import { useAdmin } from './AdminData'
import { card, dateTime, done, Empty, whatsappLink } from './ui'
import { normalisePkMobile } from '@/lib/pricing'

/** Messages customers sent through the Contact page */
export default function ContactInbox() {
  const { inbox, setShop } = useAdmin()
  const [showHandled, setShowHandled] = useState(false)
  const waiting = inbox.filter(m => !m.handled)
  const shown = showHandled ? inbox : waiting

  const mark = (id: string, handled: boolean) => {
    const message = inbox.find(m => m.id === id)
    setShop('inbox', list => list.map(m => (m.id === id ? { ...m, handled } : m)))
    if (message) done(`Message from ${message.name} marked ${handled ? 'as answered' : 'as waiting'}`)
  }

  return (
    <section aria-labelledby="inbox-h" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="inbox-h" className="text-3xl">
            Inbox
          </h2>
          <p className="mt-1 text-umber">
            {waiting.length === 0 ? 'Every message has been answered.' : `${waiting.length} waiting for a reply.`}
          </p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showHandled}
            onChange={e => setShowHandled(e.target.checked)}
            className="h-4 w-4 accent-caramel"
          />
          Show answered messages
        </label>
      </div>

      <div className={`${card} mt-4 overflow-hidden`}>
        {shown.length === 0 ? (
          <Empty title="Inbox is clear" text="Messages from the Contact page arrive here." />
        ) : (
          <ul className="divide-y divide-hairline">
            {shown.map(m => {
              const phone = normalisePkMobile(m.contact)
              const email = /@/.test(m.contact) ? m.contact : null
              return (
                <li key={m.id} className={clsx('p-5 sm:p-6', m.handled && 'text-umber')}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-medium text-espresso">
                      {m.name} <span className="font-normal text-umber">{m.contact}</span>
                    </p>
                    <p className="text-sm text-umber">{dateTime(m.createdAt)}</p>
                  </div>
                  <p className="mt-2 max-w-prose whitespace-pre-line">{m.message}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {phone && (
                      <>
                        <a
                          href={whatsappLink(
                            phone,
                            `Assalam o alaikum ${m.name.split(' ')[0]}, thank you for writing to us.`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-outline min-h-10 px-4 text-sm"
                        >
                          <FaWhatsapp size={15} /> WhatsApp
                        </a>
                        <a href={`tel:${phone}`} className="btn-outline min-h-10 px-4 text-sm">
                          <Phone size={15} /> Call
                        </a>
                      </>
                    )}
                    {email && (
                      <a href={`mailto:${email}`} className="btn-outline min-h-10 px-4 text-sm">
                        <Mail size={15} /> Email
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => mark(m.id, !m.handled)}
                      className="link ml-auto min-h-10 text-sm"
                    >
                      {m.handled ? 'Mark as waiting' : 'Mark as answered'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
