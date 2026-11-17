'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'

// Matches the closing animation in globals.css
const CLOSE_MS = 300

type Props = {
  open: boolean
  onClose: () => void
  /** Read to screen readers as the dialog's name */
  label: string
  children: ReactNode
  /** Classes for the panel: width, background, shape */
  className?: string
  /** Classes for the backdrop */
  overlayClassName?: string
  closeClassName?: string
}

/**
 * Dialog that animates in and out. It stays mounted for the length of the
 * closing animation, traps Tab, closes on Escape or a backdrop click, and
 * returns focus to whatever opened it.
 */
export default function Modal({ open, onClose, label, children, className, overlayClassName, closeClassName }: Props) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      opener.current = document.activeElement
      setClosing(false)
      setMounted(true)
      return
    }
    if (!mounted) return
    setClosing(true)
    const t = setTimeout(() => {
      setMounted(false)
      setClosing(false)
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }, CLOSE_MS)
    return () => clearTimeout(t)
    // `mounted` is read, not watched: this runs only when `open` flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.body.style.overflow = previous
    }
  }, [mounted])

  if (!mounted) return null

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panel.current) return
    const items = panel.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      data-state={closing ? 'closing' : 'open'}
      className={clsx(
        // Flex with an auto margin keeps a tall panel reachable when it scrolls
        'modal-overlay fixed inset-0 z-[90] flex overflow-y-auto p-4 sm:p-6',
        overlayClassName ?? 'bg-soot/70 backdrop-blur-sm',
      )}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={clsx('modal-panel relative m-auto w-full focus:outline-none', className)}
      >
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={clsx(
            'absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full transition-transform duration-300 hover:rotate-90',
            closeClassName ?? 'bg-linen/90 text-espresso backdrop-blur',
          )}
        >
          <X size={20} />
        </button>
      </div>
    </div>,
    document.body,
  )
}
