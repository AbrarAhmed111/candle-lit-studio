'use client'

import { usePathname } from 'next/navigation'
import { FaWhatsapp } from 'react-icons/fa'
import { store } from '@/data/store'

// Checkout keeps its place-order button clear of the floating chat button
const hiddenOn = ['/checkout']

export default function WhatsAppButton() {
  const pathname = usePathname()
  if (hiddenOn.some(p => pathname.startsWith(p))) return null

  return (
    <a
      href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent('Hello, I have a question about your candles.')}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="wa-btn fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#1F8A4C] text-white shadow-[0_10px_24px_-8px_rgba(30,20,16,0.55)] transition-[transform,bottom] duration-300 hover:scale-105"
    >
      <FaWhatsapp size={28} />
    </a>
  )
}
