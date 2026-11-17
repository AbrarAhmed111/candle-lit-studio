import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import { faqs } from '@/data/store'

export const metadata: Metadata = {
  title: 'Questions and answers',
  description: 'Payment, delivery, tracking, returns and candle questions, answered.',
}

export default function FaqPage() {
  return (
    <div className="page pt-8 lg:pt-12">
      <Breadcrumbs items={[{ label: 'Questions and answers' }]} />
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <div>
          <h1 className="text-5xl lg:text-6xl">Questions and answers</h1>
          <p className="mt-4 text-lg text-umber">
            Can’t find yours?{' '}
            <Link href="/contact" className="link">
              Contact us
            </Link>
            .
          </p>
        </div>
        <div className="divide-y divide-hairline border-y border-hairline">
          {faqs.map(f => (
            <details key={f.q} className="group/d">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-[1.35rem] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden className="font-sans text-2xl font-light transition-transform group-open/d:rotate-45">
                  +
                </span>
              </summary>
              <p className="max-w-prose pb-6 text-umber">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
