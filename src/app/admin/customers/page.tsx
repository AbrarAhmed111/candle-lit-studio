'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Download, Search } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useAdmin } from '@/components/admin/AdminData'
import {
  card,
  downloadCsv,
  Empty,
  input,
  Loading,
  PageHeader,
  shortDate,
  StatusBadge,
  td,
  th,
  whatsappLink,
} from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import { formatPKR } from '@/lib/pricing'

export default function AdminCustomersPage() {
  const { orders, customers } = useAdmin()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const [city, setCity] = useState('')
  const [openPhone, setOpenPhone] = useState<string | null>(null)

  if (!orders) {
    return (
      <>
        <PageHeader title="Customers" />
        <div className="mt-8">
          <Loading />
        </div>
      </>
    )
  }

  const q = query.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  const found = customers.filter(
    c =>
      (!q ||
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        (digits.length > 2 && c.phone.includes(digits))) &&
      (!city || c.city === city) &&
      (!kind || (kind === 'returning' ? c.orders.length > 1 : c.orders.length === 1)),
  )
  const cities = [...new Set(customers.map(c => c.city))].sort()
  const viewed = customers.find(c => c.phone === openPhone)

  const exportCsv = () =>
    downloadCsv('customers.csv', [
      ['Name', 'Phone', 'Email', 'City', 'Orders', 'Delivered spend (PKR)', 'First order', 'Last order'],
      ...found.map(c => [
        c.name,
        c.phone,
        c.email ?? '',
        c.city,
        c.orders.length,
        c.spent,
        shortDate(c.firstOrderAt),
        shortDate(c.lastOrderAt),
      ]),
    ])

  return (
    <>
      <PageHeader
        title="Customers"
        text={`${customers.length} customers, ${customers.filter(c => c.orders.length > 1).length} have ordered more than once.`}
      >
        <button type="button" onClick={exportCsv} disabled={found.length === 0} className="btn-outline min-h-11 px-5 text-sm">
          <Download size={16} /> Export {found.length} to CSV
        </button>
      </PageHeader>

      <div className="mt-8 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-umber" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name, phone or email"
            aria-label="Search customers"
            className={`${input} w-full pl-10`}
          />
        </div>
        <select aria-label="Customer type" value={kind} onChange={e => setKind(e.target.value)} className={input}>
          <option value="">New and returning</option>
          <option value="returning">Returning</option>
          <option value="new">One order so far</option>
        </select>
        <select aria-label="City" value={city} onChange={e => setCity(e.target.value)} className={input}>
          <option value="">Any city</option>
          {cities.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className={`${card} mt-4 overflow-hidden`}>
        {found.length === 0 ? (
          <Empty title="No customers match" text="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-[0.95rem]">
              <thead className="border-b border-hairline bg-wax/50">
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>City</th>
                  <th className={`${th} text-right`}>Orders</th>
                  <th className={`${th} text-right`}>Delivered spend</th>
                  <th className={th}>Last order</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {found.map(c => (
                  <tr key={c.phone}>
                    <td className={td}>
                      <button type="button" onClick={() => setOpenPhone(c.phone)} className="text-left font-medium hover:text-caramel">
                        {c.name}
                      </button>
                      <span className="block text-sm text-umber">
                        {c.phone}
                        {c.email && `, ${c.email}`}
                      </span>
                    </td>
                    <td className={td}>{c.city}</td>
                    <td className={`${td} text-right tabular-nums`}>{c.orders.length}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatPKR(c.spent)}</td>
                    <td className={td}>{shortDate(c.lastOrderAt)}</td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <button type="button" onClick={() => setOpenPhone(c.phone)} className="link min-h-11 px-2 text-sm">
                        View profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(viewed)}
        onClose={() => setOpenPhone(null)}
        label="Customer profile"
        className="max-w-lg rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        {viewed && (
          <>
            <h2 className="pr-10 text-3xl">{viewed.name}</h2>
            <p className="mt-1 text-umber">Customer since {shortDate(viewed.firstOrderAt)}</p>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                ['Orders', String(viewed.orders.length)],
                ['Delivered spend', formatPKR(viewed.spent)],
                ['Last order', shortDate(viewed.lastOrderAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-wax/60 p-3">
                  <dt className="text-sm text-umber">{label}</dt>
                  <dd className="mt-1 font-display text-xl">{value}</dd>
                </div>
              ))}
            </dl>
            <address className="mt-5 not-italic text-umber">
              {viewed.phone}
              {viewed.email && (
                <>
                  <br />
                  {viewed.email}
                </>
              )}
              <br />
              {viewed.address}, {viewed.area}, {viewed.city}
            </address>
            <a
              href={whatsappLink(viewed.phone, `Assalam o alaikum ${viewed.name.split(' ')[0]}, this is Candle Lit Studio.`)}
              target="_blank"
              rel="noreferrer"
              className="btn-outline mt-4 min-h-11 px-4 text-sm"
            >
              <FaWhatsapp size={17} /> WhatsApp
            </a>
            <h3 className="mt-6 font-sans text-sm font-semibold tracking-normal">Order history</h3>
            <ul className="mt-2 max-h-60 divide-y divide-hairline overflow-y-auto border-y border-hairline">
              {viewed.orders.map(o => (
                <li key={o.number}>
                  <Link href={`/admin/orders/${o.number}`} className="flex items-center justify-between gap-3 py-3 hover:text-caramel">
                    <span>
                      <span className="font-medium">{o.number}</span>
                      <span className="ml-2 text-sm text-umber">{shortDate(o.placedAt)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusBadge status={o.status} />
                      <span className="tabular-nums">{formatPKR(o.total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </>
  )
}
