'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin } from './AdminData'
import { card, dateTime, Empty } from './ui'
import { adminEmailOverview, type EmailOverview } from '@/lib/actions/admin'

/** Whether email is set up, and every email the store has sent */
export function useEmailOverview() {
  const { live } = useAdmin()
  const [overview, setOverview] = useState<EmailOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!live) return
    adminEmailOverview().then(r => {
      if (r.ok) setOverview(r.data)
      else setError(r.error)
    })
  }, [live])

  useEffect(load, [load])
  return { live, overview, error, reload: load }
}

export function EmailStatus({ live, overview }: { live: boolean; overview: EmailOverview | null }) {
  const ready = live && overview?.smtp && overview.serviceKey
  return (
    <p
      className={clsx(
        'mt-6 rounded-2xl px-4 py-3 text-[0.95rem]',
        ready ? 'bg-sage/15 text-sage' : 'bg-wax/60 text-umber',
      )}
    >
      {!live
        ? 'Automatic emails are switched off on this copy of the store.'
        : !overview
          ? 'Checking the email setup…'
          : ready
            ? 'Email is on. Switched-on emails below are sent automatically.'
            : 'Email sending is not set up yet. Ask your website developer to finish the email setup.'}
    </p>
  )
}

const tone = { sent: 'bg-sage/15 text-sage', failed: 'bg-wine/10 text-wine', skipped: 'bg-wax text-umber' }

export default function EmailLog({ overview, reload }: { overview: EmailOverview | null; reload: () => void }) {
  const { templates } = useAdmin()
  const [failedOnly, setFailedOnly] = useState(false)
  const name = (id: string) => (id === 'newsletter' ? 'Newsletter' : (templates.find(t => t.id === id)?.name ?? id))
  const shown = (overview?.log ?? []).filter(e => !failedOnly || e.status === 'failed')

  return (
    <section aria-labelledby="log-h" className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="log-h" className="text-3xl">
            Sent emails
          </h2>
          <p className="mt-1 text-umber">The last 200 emails, newest first. A failed email never cancels an order.</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={failedOnly}
              onChange={e => setFailedOnly(e.target.checked)}
              className="h-4 w-4 accent-caramel"
            />
            Failed only
          </label>
          <button type="button" onClick={reload} className="btn-outline min-h-11 px-4 text-sm">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>
      <div className={`${card} relative mt-4 overflow-x-auto`}>
        {shown.length === 0 ? (
          <Empty title="Nothing sent yet" text="Order, welcome and alert emails appear here once they go out." />
        ) : (
          <table className="w-full min-w-[46rem] text-[0.95rem]">
            <thead className="border-b border-hairline bg-wax/50">
              <tr>
                {['Sent', 'Email', 'To', 'Order', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium text-umber">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {shown.map(e => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-umber">{dateTime(e.at)}</td>
                  <td className="px-4 py-3">
                    {name(e.templateId)}
                    <span className="block max-w-xs truncate text-sm text-umber">{e.subject}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{e.to}</td>
                  <td className="px-4 py-3 text-sm">{e.orderNumber ?? ''}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('rounded-full px-2.5 py-1 text-sm font-medium', tone[e.status])}>
                      {e.status}
                    </span>
                    {e.error && <span className="mt-1 block max-w-xs text-sm text-wine">{e.error}</span>}
                    {e.attempts > 1 && <span className="mt-1 block text-xs text-umber">{e.attempts} attempts</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
