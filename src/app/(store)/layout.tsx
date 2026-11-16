import { ReactNode } from 'react'
import Header from '@/components/store/Header'
import Footer from '@/components/store/Footer'
import NewsletterPopup from '@/components/store/NewsletterPopup'
import WhatsAppButton from '@/components/store/WhatsAppButton'

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-linen focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <WhatsAppButton />
      <NewsletterPopup />
    </>
  )
}
