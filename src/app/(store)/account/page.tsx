'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import OrderCard from '@/components/account/OrderCard'
import { useAccount, useMyOrders } from '@/components/account/useAccount'
import { formatPKR } from '@/lib/pricing'
import { useAppSelector } from '@/store/store'

export default function AccountOverview() {
  const { account } = useAccount()
  const orders = useMyOrders(account.profile.phone)
  const saved = useAppSelector(s => s.wishlist.ids.length)
  const home = account.addresses.find(a => a.isDefault) ?? account.addresses[0]
  const firstName = account.profile.name.split(' ')[0]
  const active = orders?.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled') ?? []
  const delivered = orders?.filter(o => o.status === 'Delivered') ?? []

  const tiles = [
    { href: '/account/orders', label: 'Orders', value: orders ? String(orders.length) : '…', hint: `${active.length} on the way` },
    { href: '/wishlist', label: 'Wishlist', value: String(saved), hint: saved === 1 ? 'saved candle' : 'saved candles' },
    {
      href: '/account/orders',
      label: 'Delivered so far',
      value: formatPKR(delivered.reduce((sum, o) => sum + o.total, 0)),
      hint: `${delivered.length} delivered ${delivered.length === 1 ? 'order' : 'orders'}`,
    },
  ]

  return (
    <>
      <h1 className="text-5xl italic lg:text-6xl">Hello, {firstName}</h1>
      <p className="mt-3 text-lg text-umber">Your orders, addresses and saved candles, in one place.</p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map(t => (
          <Link
            key={t.label}
            href={t.href}
            className="group rounded-2xl border border-hairline bg-linen p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-caramel"
          >
            <p className="flex items-center justify-between text-sm text-umber">
              {t.label}
              <ArrowUpRight size={16} className="text-caramel transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </p>
            <p className="mt-2 font-display text-4xl leading-none">{t.value}</p>
            <p className="mt-2 text-sm text-umber">{t.hint}</p>
          </Link>
        ))}
      </div>

      <section className="mt-12" aria-labelledby="latest-h">
        <div className="flex items-end justify-between gap-4">
          <h2 id="latest-h" className="text-3xl">
            Latest order
          </h2>
          <Link href="/account/orders" className="link text-sm">
            All orders
          </Link>
        </div>
        <div className="mt-5">
          {!orders ? (
            <div role="status" aria-label="Loading" className="h-44 animate-pulse rounded-2xl bg-wax/70" />
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-linen p-8 text-center">
              <p className="font-display text-2xl">No orders yet</p>
              <p className="mt-2 text-umber">Your first candle is one tap away.</p>
              <Link href="/shop" className="btn-primary mt-5">
                Shop all candles
              </Link>
            </div>
          ) : (
            <OrderCard order={orders[0]} />
          )}
        </div>
      </section>

      <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-linen p-6">
          <h2 className="text-2xl">Default address</h2>
          {home ? (
            <address className="mt-3 not-italic text-umber">
              <span className="text-espresso">{home.name}</span>
              <br />
              {home.address}
              <br />
              {home.area}, {home.city}
              <br />
              {home.phone}
            </address>
          ) : (
            <p className="mt-3 text-umber">No saved address yet.</p>
          )}
          <Link href="/account/addresses" className="link mt-4 inline-block text-sm">
            Manage addresses
          </Link>
        </div>
        <div className="rounded-2xl border border-hairline bg-linen p-6">
          <h2 className="text-2xl">Profile</h2>
          <p className="mt-3 text-umber">
            <span className="text-espresso">{account.profile.name}</span>
            <br />
            {account.profile.email}
            <br />
            {account.profile.phone}
          </p>
          <Link href="/account/profile" className="link mt-4 inline-block text-sm">
            Edit profile and preferences
          </Link>
        </div>
      </section>
    </>
  )
}
