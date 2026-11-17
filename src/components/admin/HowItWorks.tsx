'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { HelpCircle, X } from 'lucide-react'

/**
 * A short explanation at the top of a dashboard page. Open the first time,
 * then folded away once read; the "How this works" link brings it back.
 */
export default function HowItWorks({
  id,
  title = 'How this works',
  children,
}: {
  id: string
  title?: string
  children: ReactNode
}) {
  const key = `cls_help_${id}`
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(key) !== 'closed')
    } catch {
      setOpen(true)
    }
  }, [key])

  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(key, 'closed')
    } catch {
      // ignore
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-umber hover:text-caramel"
      >
        <HelpCircle size={16} /> {title}
      </button>
    )
  }

  return (
    <aside className="relative mt-6 rounded-2xl border border-caramel/30 bg-ember/10 p-5 pr-12 text-[0.95rem] leading-relaxed">
      <p className="flex items-center gap-2 font-medium">
        <HelpCircle size={17} className="text-caramel" /> {title}
      </p>
      <div className="mt-2 space-y-2 text-umber">{children}</div>
      <button
        type="button"
        onClick={close}
        aria-label="Hide this explanation"
        className="absolute right-2 top-2 grid h-10 w-10 place-items-center text-umber hover:text-espresso"
      >
        <X size={17} />
      </button>
    </aside>
  )
}
