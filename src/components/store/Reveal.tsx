'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'

type RevealProps = {
  children: ReactNode
  /** Stagger in milliseconds */
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'section' | 'figure'
}

/** Fades content up the first time it scrolls into view. */
export default function Reveal({ children, delay = 0, className, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in')
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Tag = as as 'div'
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={clsx('reveal', className)}
      style={{ '--d': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
