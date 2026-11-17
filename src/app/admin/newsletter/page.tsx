'use client'

import { FormEvent, useState } from 'react'
import { Download, Search } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin } from '@/components/admin/AdminData'
import { card, dateTime, done, downloadCsv, Empty, input, Kpi, PageHeader, shortDate, td, th } from '@/components/admin/ui'

const DAY = 86_400_000

export default function AdminNewsletterPage() {
  const { subscribers, drafts, customers, setShop } = useAdmin()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [segment, setSegment] = useState('All subscribers')
  const [error, setError] = useState('')

  const active = subscribers.filter(s => s.subscribed)
  const buyerEmails = (test: (c: (typeof customers)[number]) => boolean) =>
    new Set(customers.filter(test).flatMap(c => (c.email ? [c.email] : [])))

  // Who each group reaches. Only people still subscribed are counted.
  const segments: Record<string, number> = {
    'All subscribers': active.length,
    'Have ordered before': active.filter(s => buyerEmails(() => true).has(s.email)).length,
    'Ordered more than once': active.filter(s => buyerEmails(c => c.orders.length > 1).has(s.email)).length,
    'No order in the last 30 days': active.filter(
      s => !buyerEmails(c => Date.now() - new Date(c.lastOrderAt).getTime() < 30 * DAY).has(s.email),
    ).length,
    'Never ordered': active.filter(s => !buyerEmails(() => true).has(s.email)).length,
  }

  const q = query.trim().toLowerCase()
  const shown = subscribers.filter(s => !q || s.email.includes(q) || s.name?.toLowerCase().includes(q))

  const saveDraft = (e: FormEvent) => {
    e.preventDefault()
    if (subject.trim().length < 3) return setError('Enter a subject line.')
    if (body.trim().length < 20) return setError('Write the email, at least 20 characters.')
    setShop('drafts', list => [
      { id: `d${Date.now()}`, subject: subject.trim(), body: body.trim(), segment, savedAt: new Date().toISOString() },
      ...list,
    ])
    done(`Newsletter draft saved: ${subject.trim()}`)
    setSubject('')
    setBody('')
  }

  const setSubscribed = (email: string, subscribed: boolean) => {
    setShop('subscribers', list => list.map(s => (s.email === email ? { ...s, subscribed } : s)))
    done(`${email} ${subscribed ? 'resubscribed' : 'unsubscribed'}`)
  }

  const exportCsv = () =>
    downloadCsv('subscribers.csv', [
      ['Email', 'Name', 'Joined', 'Source', 'Status'],
      ...shown.map(s => [s.email, s.name ?? '', shortDate(s.joinedAt), s.source, s.subscribed ? 'Subscribed' : 'Unsubscribed']),
    ])

  return (
    <>
      <PageHeader title="Newsletter" text="People who asked to hear from you, and the emails you are preparing for them." />

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Subscribed" value={String(active.length)} />
        <Kpi
          label="Joined in the last 30 days"
          value={String(subscribers.filter(s => Date.now() - new Date(s.joinedAt).getTime() < 30 * DAY).length)}
        />
        <Kpi label="Unsubscribed" value={String(subscribers.length - active.length)} hint="Never emailed again" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section aria-labelledby="subs-h">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="subs-h" className="text-3xl">
              Subscribers
            </h2>
            <button type="button" onClick={exportCsv} disabled={shown.length === 0} className="btn-outline min-h-11 px-5 text-sm">
              <Download size={16} /> Export {shown.length} to CSV
            </button>
          </div>
          <div className="relative mt-4">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-umber" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Email or name"
              aria-label="Search subscribers"
              className={`${input} w-full pl-10`}
            />
          </div>
          <div className={`${card} mt-4 overflow-hidden`}>
            {shown.length === 0 ? (
              <Empty title="No subscribers match" text="Try a different search." />
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[30rem] text-[0.95rem]">
                  <thead className="border-b border-hairline bg-wax/50">
                    <tr>
                      <th className={th}>Subscriber</th>
                      <th className={th}>Joined</th>
                      <th className={th}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {shown.map(s => (
                      <tr key={s.email} className={clsx(!s.subscribed && 'text-umber')}>
                        <td className={td}>
                          <span className="break-all">{s.email}</span>
                          <span className="block text-sm text-umber">
                            {s.name ?? 'No name'}
                            {!s.subscribed && ', unsubscribed'}
                          </span>
                        </td>
                        <td className={td}>
                          {shortDate(s.joinedAt)}
                          <span className="block text-sm text-umber">{s.source}</span>
                        </td>
                        <td className={`${td} text-right`}>
                          <button type="button" onClick={() => setSubscribed(s.email, !s.subscribed)} className="link min-h-11 px-2 text-sm">
                            {s.subscribed ? 'Unsubscribe' : 'Resubscribe'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="write-h">
          <h2 id="write-h" className="text-3xl">
            Write an email
          </h2>
          <form onSubmit={saveDraft} noValidate className={`${card} mt-4 p-5 sm:p-6`}>
            <label htmlFor="nl-segment" className="field-label">
              Send to
            </label>
            <select id="nl-segment" value={segment} onChange={e => setSegment(e.target.value)} className="field">
              {Object.entries(segments).map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
            <label htmlFor="nl-subject" className="field-label mt-4">
              Subject
            </label>
            <input
              id="nl-subject"
              value={subject}
              onChange={e => {
                setSubject(e.target.value)
                setError('')
              }}
              placeholder="Winter Bonfire is back"
              className="field"
            />
            <label htmlFor="nl-body" className="field-label mt-4">
              Email
            </label>
            <textarea
              id="nl-body"
              rows={7}
              value={body}
              onChange={e => {
                setBody(e.target.value)
                setError('')
              }}
              className="field py-3"
            />
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary mt-5">
              Save draft
            </button>
            <p className="mt-3 text-sm text-umber">
              Sending starts once the email service is connected. Every email will carry an unsubscribe link.
            </p>
          </form>

          <h3 className="mt-8 text-2xl">Drafts</h3>
          {drafts.length === 0 ? (
            <p className="mt-3 text-umber">No drafts yet. Saved emails wait here until you send them.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {drafts.map(d => (
                <li key={d.id} className={`${card} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{d.subject}</p>
                      <p className="text-sm text-umber">
                        To {d.segment.toLowerCase()} ({segments[d.segment] ?? 0}). Saved {dateTime(d.savedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShop('drafts', list => list.filter(x => x.id !== d.id))
                        done(`Newsletter draft deleted: ${d.subject}`)
                      }}
                      className="min-h-11 shrink-0 text-sm text-wine underline decoration-1 underline-offset-4"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-umber">{d.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
