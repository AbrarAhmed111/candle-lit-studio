'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import clsx from 'clsx'
import Modal from './Modal'
import ProductPhoto, { photoUrl } from './ProductPhoto'
import type { Product } from '@/types'

export default function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [full, setFull] = useState(false)
  const frame = useRef<HTMLButtonElement>(null)
  const count = product.images.length
  const many = count > 1

  const step = (by: number) => setActive(i => (i + by + count) % count)

  // Zoom follows the pointer. Mouse only: on touch, a tap opens the full view.
  const track = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !frame.current) return
    const box = frame.current.getBoundingClientRect()
    frame.current.style.setProperty('--zx', `${((e.clientX - box.left) / box.width) * 100}%`)
    frame.current.style.setProperty('--zy', `${((e.clientY - box.top) / box.height) * 100}%`)
    setZoomed(true)
  }

  return (
    <div className="lg:sticky lg:top-36">
      <button
        ref={frame}
        type="button"
        onClick={() => setFull(true)}
        onPointerMove={track}
        onPointerLeave={() => setZoomed(false)}
        aria-label={`Open ${product.name} photo ${active + 1} in full view`}
        className="alcove group/photo relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden"
        style={{ backgroundColor: product.art.bg }}
      >
        <span key={active} className="fade-up block h-full w-full">
          <ProductPhoto
            product={product}
            index={active}
            sizes="(min-width: 1024px) 45vw, 100vw"
            eager
            decorative
            className="zoom-photo"
            data-zoom={zoomed}
          />
        </span>
        <span
          className={clsx(
            'pointer-events-none absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-linen/90 px-3.5 py-2 text-sm text-espresso backdrop-blur transition-opacity duration-300',
            zoomed && 'opacity-0',
          )}
        >
          <Expand size={15} /> Full view
        </span>
      </button>

      {many && (
        <div className="mt-3 grid grid-cols-4 gap-3" role="group" aria-label="Product photos">
          {product.images.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              aria-label={`Photo ${i + 1} of ${count}`}
              className={clsx(
                'aspect-square overflow-hidden rounded-xl border-2 transition-colors',
                active === i ? 'border-espresso' : 'border-transparent hover:border-hairline',
              )}
              style={{ backgroundColor: product.art.bg }}
            >
              <ProductPhoto product={product} index={i} sizes="120px" decorative />
            </button>
          ))}
        </div>
      )}

      <Modal
        open={full}
        onClose={() => setFull(false)}
        label={`${product.name} photos`}
        overlayClassName="bg-soot/95"
        className="flex h-[calc(100svh-2rem)] max-w-6xl flex-col sm:h-[calc(100svh-3rem)]"
        closeClassName="bg-wax/15 text-ivory hover:bg-wax/25"
      >
        <FullView product={product} active={active} step={step} setActive={setActive} />
      </Modal>
    </div>
  )
}

function FullView({
  product,
  active,
  step,
  setActive,
}: {
  product: Product
  active: number
  step: (by: number) => void
  setActive: (i: number) => void
}) {
  const count = product.images.length
  const many = count > 1

  useEffect(() => {
    if (!many) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [many, step])

  const arrow =
    'absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-wax/15 text-ivory transition-colors hover:bg-ember hover:text-soot'

  return (
    <>
      <div className="relative min-h-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active}
          src={photoUrl(product.images[active], 1600)}
          alt={`${product.name} candle, photo ${active + 1} of ${count}`}
          className="fade-up h-full w-full object-contain"
        />
        {many && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className={clsx(arrow, 'left-0 sm:left-2')}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className={clsx(arrow, 'right-0 sm:right-2')}
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 pt-4 text-wax">
        <p className="font-display text-xl italic text-ivory">{product.name}</p>
        {many && (
          <div className="flex items-center gap-2">
            {product.images.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1} of ${count}`}
                aria-current={i === active}
                className={clsx(
                  'h-14 w-11 overflow-hidden rounded-lg border-2 transition-[border-color,opacity]',
                  i === active ? 'border-ember' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <ProductPhoto product={product} index={i} sizes="44px" decorative />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
