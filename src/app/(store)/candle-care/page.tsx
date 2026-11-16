import type { Metadata } from 'next'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import CandleArt from '@/components/store/CandleArt'
import { careSteps, safetyNotes } from '@/data/store'

export const metadata: Metadata = {
  title: 'Candle care',
  description: 'Four habits that make a candle burn cleaner and last longer.',
}

export default function CandleCarePage() {
  return (
    <div className="page pt-8 lg:pt-12">
      <Breadcrumbs items={[{ label: 'Candle care' }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
        <div>
          <h1 className="text-5xl lg:text-6xl">Candle care</h1>
          <p className="mt-4 text-lg text-umber">
            Four habits that make a candle burn cleaner and last longer.
          </p>
          <div className="alcove mt-10 hidden aspect-[4/5] max-w-xs items-end justify-center bg-wax lg:flex">
            <CandleArt shape="pillar" wax="#C98E52" vessel="#C98E52" lit className="h-[85%] w-auto" />
          </div>
        </div>

        <div>
          <ol className="divide-y divide-hairline border-y border-hairline">
            {careSteps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-4 py-7">
                <span className="font-display text-4xl italic text-caramel">{i + 1}</span>
                <div>
                  <h2 className="text-2xl">{s.title}</h2>
                  <p className="mt-2 max-w-prose text-umber">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <section className="mt-12 bg-wax/60 p-6 sm:p-8">
            <h2 className="text-2xl">Burn safely</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-umber">
              {safetyNotes.map(n => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
