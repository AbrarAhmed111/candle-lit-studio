import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ArrowUpRight, ClipboardCopy, Mail, PackageSearch } from 'lucide-react'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import Reveal from '@/components/store/Reveal'
import TrackOrder from '@/components/store/TrackOrder'
import { couriers, store } from '@/data/store'

export const metadata: Metadata = {
  title: 'Track order',
  description:
    'Find the tracking ID in your dispatch email, then follow your parcel on the courier’s official website.',
}

const steps = [
  {
    icon: Mail,
    title: 'Check your email inbox',
    body: 'When your order leaves our studio we email you the courier name and your tracking ID. Look for a message from Candle Lit Studio, and check spam or promotions too.',
  },
  {
    icon: ClipboardCopy,
    title: 'Copy your tracking ID',
    body: 'It is the number shown next to the courier name in that email.',
  },
  {
    icon: PackageSearch,
    title: 'Track it on the courier’s website',
    body: 'Open the courier named in your email from the list below and paste your tracking ID there. The courier’s website shows exactly where your parcel is.',
  },
]

export default function TrackOrderPage() {
  return (
    <div className="page pt-8 lg:pt-12">
      <Breadcrumbs items={[{ label: 'Track order' }]} />
      <h1 className="mt-6 text-5xl lg:text-6xl">Track your order</h1>
      <p className="mt-4 max-w-xl text-lg text-umber">
        Three steps and you will know where your candles are.
      </p>

      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal
            as="li"
            key={s.title}
            delay={i * 110}
            className="rounded-[2rem] border border-hairline bg-linen p-8"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-wax text-caramel">
                <s.icon size={22} />
              </span>
              <span className="font-display text-4xl italic text-caramel">{i + 1}</span>
            </div>
            <h2 className="mt-6 text-2xl">{s.title}</h2>
            <p className="mt-2 text-umber">{s.body}</p>
          </Reveal>
        ))}
      </ol>

      <section className="mt-14" aria-labelledby="couriers-h">
        <h2 id="couriers-h" className="text-3xl lg:text-4xl">
          Courier tracking websites
        </h2>
        <p className="mt-3 max-w-xl text-umber">
          Choose the courier named in your dispatch email. Each link opens the
          courier’s official tracking page in a new tab.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {couriers.map(c => (
            <li key={c.name}>
              <a
                href={c.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-hairline bg-linen px-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-caramel"
              >
                <span className="font-medium">Track on {c.name}</span>
                <ArrowUpRight
                  size={18}
                  className="shrink-0 text-caramel transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-umber">
          No email yet? Orders are dispatched within 2 working days. If it has been
          longer,{' '}
          <a
            href={`https://wa.me/${store.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            message us on WhatsApp
          </a>{' '}
          with your order number.
        </p>
      </section>

      <section className="mt-16 rounded-[2rem] bg-wax/60 p-6 sm:p-10" aria-labelledby="status-h">
        <h2 id="status-h" className="text-3xl lg:text-4xl">
          See your order status
        </h2>
        <p className="mb-8 mt-3 max-w-xl text-umber">
          Enter your order number and mobile number to see whether your order is
          confirmed, packed or dispatched, along with its courier and tracking ID.
        </p>
        <Suspense>
          <TrackOrder />
        </Suspense>
      </section>
    </div>
  )
}
