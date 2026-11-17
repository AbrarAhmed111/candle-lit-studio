'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Flame, Pause, Play } from 'lucide-react'
import clsx from 'clsx'
import { heroSlides } from '@/data/store'

const INTERVAL = 6500
const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

// Fixed values so server and client render the same embers
const embers = [
  { left: '44%', s: 4, t: 7, d: 0, x: -30 },
  { left: '52%', s: 3, t: 9, d: 1.6, x: 46 },
  { left: '48%', s: 5, t: 8, d: 3.1, x: -64 },
  { left: '56%', s: 3, t: 10, d: 4.4, x: 22 },
  { left: '50%', s: 4, t: 6.5, d: 5.2, x: 70 },
  { left: '46%', s: 2, t: 11, d: 2.3, x: -12 },
]

export default function HeroSlider() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)
  const touchX = useRef<number | null>(null)
  const count = heroSlides.length
  const slide = heroSlides[index]

  const go = useCallback((step: number) => setIndex(i => (i + step + count) % count), [count])

  // Autoplay. Stops on hover, on focus inside, when paused, or with reduced motion.
  const running = playing && !hovered
  useEffect(() => {
    if (!running) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => go(1), INTERVAL)
    return () => clearTimeout(t)
  }, [running, index, go])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-soot text-ivory"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') go(-1)
        if (e.key === 'ArrowRight') go(1)
      }}
      onTouchStart={e => {
        touchX.current = e.touches[0].clientX
      }}
      onTouchEnd={e => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
      }}
    >
      {/* Photographs, cross-faded */}
      {heroSlides.map((s, i) => (
        <div
          key={s.title.join(' ')}
          aria-hidden={i !== index}
          className={clsx(
            'absolute inset-0 transition-opacity duration-[1200ms] ease-out',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={i === index ? 'on' : 'off'}
            src={s.image}
            alt={i === index ? s.alt : ''}
            fetchPriority={i === 0 ? 'high' : 'low'}
            className={clsx('absolute inset-0 h-full w-full object-cover lg:left-[16%]', i === index && 'hero-photo')}
            style={{ objectPosition: s.position }}
          />
        </div>
      ))}

      {/* Darkens the copy side so text stays readable on any photo */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-soot via-soot/60 to-soot/10 lg:bg-gradient-to-r lg:from-soot lg:from-20% lg:via-soot/55 lg:via-45% lg:to-transparent lg:to-75%"
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-soot/80 to-transparent" />

      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[42%] h-0 lg:left-[40%]">
        {embers.map((e, i) => (
          <span
            key={i}
            className="ember"
            style={
              {
                left: e.left,
                '--s': `${e.s}px`,
                '--t': `${e.t}s`,
                '--d': `${e.d + 1.5}s`,
                '--x': `${e.x}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Copy. Keyed by slide so the entrance replays on every change. */}
      <div className="page relative flex flex-1 items-end pb-28 pt-32 lg:items-center lg:pb-24 lg:pt-36">
        <div
          key={index}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${count}`}
          className="max-w-2xl"
        >
          <p className="fade-up flex items-center gap-2 text-sm text-ember" style={d(100)}>
            <Flame size={16} /> {slide.kicker}
          </p>
          <Heading
            as={index === 0 ? 'h1' : 'h2'}
            className="mt-4 text-[clamp(3.1rem,13vw,4.6rem)] italic leading-[1.02] lg:text-[clamp(4.6rem,7.4vw,7.6rem)]"
          >
            {slide.title.map((line, i) => (
              <span key={line} className="line-mask">
                <span style={d(200 + i * 150)}>{line}</span>
              </span>
            ))}
          </Heading>
          <p className="fade-up mt-6 max-w-md text-lg text-wax/90 lg:text-xl" style={d(700)}>
            {slide.text}
          </p>
          <div className="fade-up mt-8 flex flex-wrap gap-3" style={d(850)}>
            <Link href={slide.primary.href} className="btn-light">
              {slide.primary.label}
            </Link>
            {slide.secondary?.label && slide.secondary.href && (
              <Link href={slide.secondary.href} className="btn-ghost-light">
                {slide.secondary.label}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      {/* Right padding keeps the controls clear of the floating WhatsApp button.
          Phones swipe between slides, so arrows and the counter are desktop-only. */}
      <div className="page absolute inset-x-0 bottom-7 flex items-center justify-between gap-4 !pr-24">
        <div className="flex items-center gap-2" role="group" aria-label="Choose slide">
          {heroSlides.map((s, i) => (
            <button
              key={s.title.join(' ')}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}: ${s.title.join(' ')}`}
              aria-current={i === index}
              className="group/dot flex h-11 items-center"
            >
              <span
                className={clsx(
                  'relative block h-[3px] overflow-hidden rounded-full bg-wax/30 transition-[width] duration-500',
                  i === index ? 'w-14' : 'w-6 group-hover/dot:bg-wax/60',
                )}
              >
                {i === index && (
                  <span
                    key={`${index}-${running}`}
                    className={clsx('absolute inset-0 origin-left rounded-full bg-ember', running && 'slide-progress')}
                    style={{ animationDuration: `${INTERVAL}ms` }}
                  />
                )}
              </span>
            </button>
          ))}
          <span className="ml-2 hidden whitespace-nowrap text-sm tabular-nums text-wax/70 sm:inline">
            {index + 1} / {count}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying(p => !p)}
            aria-label={playing ? 'Pause slides' : 'Play slides'}
            className="grid h-11 w-11 place-items-center rounded-full border border-wax/30 text-wax transition-colors hover:border-ember hover:text-ember"
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="hidden h-11 w-11 place-items-center rounded-full border border-wax/30 text-wax transition-colors hover:border-ember hover:text-ember sm:grid"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="hidden h-11 w-11 place-items-center rounded-full border border-wax/30 text-wax transition-colors hover:border-ember hover:text-ember sm:grid"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}

function Heading({ as: Tag, className, children }: { as: 'h1' | 'h2'; className: string; children: React.ReactNode }) {
  return <Tag className={className}>{children}</Tag>
}
