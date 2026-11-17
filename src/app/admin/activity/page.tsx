'use client'

import { useState } from 'react'
import { Download, Search } from 'lucide-react'
import { useAdmin } from '@/components/admin/AdminData'
import { card, dateTime, downloadCsv, Empty, input, PageHeader } from '@/components/admin/ui'

const PAGE = 25

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Karachi',
  })

export default function AdminActivityPage() {
  const { activity, orders } = useAdmin()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  // Dashboard actions plus every order's own history, newest first
  const all = [
    ...activity,
    ...(orders ?? []).flatMap(o => o.history.map(h => ({ at: h.at, text: `${o.number}: ${h.text}` }))),
  ]
    // Seeded histories include future steps for old orders; only show what has happened
    .filter(e => new Date(e.at).getTime() <= Date.now())
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const q = query.trim().toLowerCase()
  const found = q ? all.filter(e => e.text.toLowerCase().includes(q)) : all
  const shown = found.slice(0, limit)

  // Group the visible entries under a heading per day
  const days: { label: string; entries: typeof shown }[] = []
  shown.forEach(e => {
    const label = dayLabel(e.at)
    const last = days[days.length - 1]
    if (last?.label === label) last.entries.push(e)
    else days.push({ label, entries: [e] })
  })

  return (
    <>
      <PageHeader title="Activity log" text="Every change made in the dashboard and on each order, newest first.">
        <button
          type="button"
          disabled={found.length === 0}
          onClick={() => downloadCsv('activity-log.csv', [['When', 'What happened'], ...found.map(e => [dateTime(e.at), e.text])])}
          className="btn-outline min-h-11 px-5 text-sm"
        >
          <Download size={16} /> Export {found.length} to CSV
        </button>
      </PageHeader>

      <div className="relative mt-8 max-w-xl">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-umber" />
        <input
          type="search"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setLimit(PAGE)
          }}
          placeholder="Order number, product, coupon or action"
          aria-label="Search the activity log"
          className={`${input} w-full pl-10`}
        />
      </div>

      {found.length === 0 ? (
        <div className={`${card} mt-4`}>
          <Empty title="Nothing matches" text="Try a different search." />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {days.map(day => (
            <section key={day.label}>
              <h2 className="font-sans text-sm font-semibold tracking-normal text-umber">{day.label}</h2>
              <ul className={`${card} mt-2 divide-y divide-hairline`}>
                {day.entries.map((e, i) => (
                  <li key={e.at + i} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3.5">
                    <span className="min-w-0">{e.text}</span>
                    <span className="shrink-0 text-sm tabular-nums text-umber">
                      {new Date(e.at).toLocaleTimeString('en-GB', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Karachi',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {found.length > shown.length && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setLimit(l => l + PAGE)} className="btn-outline">
            Show {Math.min(PAGE, found.length - shown.length)} older
          </button>
        </div>
      )}
    </>
  )
}
