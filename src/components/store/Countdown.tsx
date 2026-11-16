'use client'

import { useEffect, useState } from 'react'

const units = [
  ['days', 86_400_000],
  ['hours', 3_600_000],
  ['min', 60_000],
  ['sec', 1000],
] as const

/** Live countdown to the end of a campaign (end of day, Asia/Karachi). */
export default function Countdown({ endsAt }: { endsAt: string }) {
  const end = new Date(`${endsAt}T23:59:59+05:00`).getTime()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (now !== null && now >= end) return null

  let left = now === null ? 0 : end - now
  return (
    <div className="flex gap-2.5" role="timer" aria-label="Time left in the sale">
      {units.map(([label, ms]) => {
        const value = Math.floor(left / ms)
        left -= value * ms
        return (
          <div
            key={label}
            className="min-w-[3.6rem] rounded-2xl bg-soot/25 px-2 py-2.5 text-center backdrop-blur-sm"
          >
            <span className="block font-display text-3xl tabular-nums leading-none">
              {now === null ? '--' : String(value).padStart(2, '0')}
            </span>
            <span className="mt-1 block text-xs text-ivory/75">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
