'use client'

import { useState } from 'react'
import { formatPKR } from '@/lib/pricing'
import { compactPKR } from './ui'

export type ChartPoint = {
  /** Short axis label, e.g. "12 Nov" */
  label: string
  value: number
  orders: number
}

const W = 760
const H = 260
const PAD = { top: 12, right: 8, bottom: 30, left: 62 }

// Rounds the axis top up to a clean number: 1, 2, 2.5, 5 or 10 times a power of ten
const niceMax = (max: number) => {
  if (max <= 0) return 1000
  const power = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find(s => s * power >= max) ?? 10
  return step * power
}

/** Order value per period. One series, so the title names it and there is no legend. */
export default function SalesChart({ points }: { points: ChartPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const top = niceMax(Math.max(...points.map(p => p.value), 0))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / Math.max(points.length, 1)
  const barW = Math.min(28, Math.max(3, slot - 2))
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => t * top)
  // At most about eight x labels, always including the last
  const every = Math.ceil(points.length / 8)
  const active = hover === null ? null : points[hover]

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Order value by period">
          {ticks.map(t => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#D9CBB3" strokeWidth={t === 0 ? 1 : 0.6} strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6F5546">
                {compactPKR(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2
            const h = Math.max(p.value > 0 ? 2 : 0, PAD.top + plotH - y(p.value))
            const r = Math.min(4, barW / 2, h)
            const base = PAD.top + plotH
            return (
              <g key={p.label + i}>
                {h > 0 && (
                  <path
                    d={`M${x} ${base} V${base - h + r} Q${x} ${base - h} ${x + r} ${base - h} H${x + barW - r} Q${x + barW} ${base - h} ${x + barW} ${base - h + r} V${base} Z`}
                    fill={hover === i ? '#2E1F17' : '#A9692F'}
                  />
                )}
                {(i % every === 0 || i === points.length - 1) && (points.length - 1 - i >= every / 2 || i === points.length - 1) && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6F5546">
                    {p.label}
                  </text>
                )}
                {/* Hit area is the whole column, wider than the bar */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
              </g>
            )
          })}
        </svg>
        {active && hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-soot px-3 py-2 text-sm text-ivory shadow-lg"
            style={{ left: `${((PAD.left + (hover + 0.5) * slot) / W) * 100}%` }}
          >
            <p className="text-wax/75">{active.label}</p>
            <p className="font-medium">{formatPKR(active.value)}</p>
            <p className="text-wax/75">
              {active.orders} {active.orders === 1 ? 'order' : 'orders'}
            </p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-umber hover:text-caramel">
          View as table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-hairline">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-wax">
              <tr>
                <th className="px-3 py-2 font-medium">Period</th>
                <th className="px-3 py-2 font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Order value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {points.map((p, i) => (
                <tr key={p.label + i}>
                  <td className="px-3 py-2">{p.label}</td>
                  <td className="px-3 py-2 tabular-nums">{p.orders}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPKR(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
