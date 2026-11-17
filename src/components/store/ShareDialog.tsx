'use client'

import { useEffect, useState } from 'react'
import { Check, Link2, Share2 } from 'lucide-react'
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Modal from './Modal'
import ProductPhoto from './ProductPhoto'
import { formatPKR, fromPrice } from '@/lib/pricing'
import type { Product } from '@/types'

type Props = { product: Product; open: boolean; onClose: () => void }

const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

export default function ShareDialog({ product, open: isOpen, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setUrl(`${window.location.origin}/products/${product.slug}`)
    setCopied(false)
    setCanNativeShare(typeof navigator.share === 'function')
  }, [isOpen, product.slug])

  const message = `${product.name} by Candle Lit Studio. ${product.tagline}.`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      return true
    } catch {
      toast.error('Copy failed. Select the link and copy it manually.')
      return false
    }
  }

  // Instagram has no share link for websites, so the link is copied first
  // and the customer pastes it into a story or message.
  const instagram = async () => {
    if (await copy()) toast.success('Link copied. Paste it in your Instagram story or message.')
    open('https://www.instagram.com/')
  }

  const native = async () => {
    try {
      await navigator.share({ title: product.name, text: message, url })
    } catch {
      // share sheet dismissed
    }
  }

  const channel =
    'group/ch flex flex-col items-center gap-2 rounded-2xl border border-hairline bg-linen px-2 py-4 text-sm transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-caramel'
  const badge =
    'grid h-12 w-12 place-items-center rounded-full text-white transition-transform duration-300 group-hover/ch:scale-110'

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      label={`Share ${product.name}`}
      className="max-w-md overflow-hidden rounded-[2rem] bg-ivory shadow-2xl"
    >
      {/* What the link looks like when it lands in a chat */}
      <div className="flex items-center gap-4 bg-wax/60 p-5 pr-16">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl" style={{ backgroundColor: product.art.bg }}>
          <ProductPhoto product={product} sizes="80px" decorative />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-umber">Share this candle</p>
          <p className="font-display text-2xl leading-tight">{product.name}</p>
          <p className="mt-1 truncate text-sm text-umber">{product.tagline}</p>
          <p className="text-sm font-medium">{formatPKR(fromPrice(product).sale)}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            className={channel}
            onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`)}
          >
            <span className={badge} style={{ backgroundColor: '#25D366' }}>
              <FaWhatsapp size={24} />
            </span>
            WhatsApp
          </button>
          <button
            type="button"
            className={channel}
            onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}
          >
            <span className={badge} style={{ backgroundColor: '#1877F2' }}>
              <FaFacebookF size={20} />
            </span>
            Facebook
          </button>
          <button type="button" className={channel} onClick={instagram}>
            <span
              className={badge}
              style={{
                background: 'linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)',
              }}
            >
              <FaInstagram size={23} />
            </span>
            Instagram
          </button>
        </div>
        <p className="mt-3 text-sm text-umber">Instagram copies the link for you to paste into a story or message.</p>

        <label htmlFor="share-link" className="field-label mt-6">
          Or copy the link
        </label>
        <div className="flex gap-2">
          <input
            id="share-link"
            readOnly
            value={url}
            onFocus={e => e.currentTarget.select()}
            className="field min-w-0 flex-1 text-sm"
          />
          <button type="button" onClick={copy} className="btn-primary shrink-0 px-5">
            {copied ? <Check size={17} /> : <Link2 size={17} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {canNativeShare && (
          <button
            type="button"
            onClick={native}
            className="mt-4 flex min-h-11 items-center gap-2 text-sm hover:text-caramel"
          >
            <Share2 size={16} /> More ways to share
          </button>
        )}
      </div>
    </Modal>
  )
}
