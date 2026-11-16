import '../assets/css/globals.css' // CSS is now included here
import type { Metadata } from 'next'
import { Bodoni_Moda, Hanken_Grotesk } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ReactNode } from 'react'
import Providers from '@/store/Providers'

const display = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL to the live domain so shared links resolve
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Candle Lit Studio | Hand-poured candles, delivered across Pakistan',
    template: '%s | Candle Lit Studio',
  },
  description:
    'Hand-poured soy candles from Quetta, in scents that feel like home: desi gulab, chai and cardamom, motia and oud. Cash on delivery across Pakistan.',
  openGraph: {
    siteName: 'Candle Lit Studio',
    locale: 'en_PK',
    type: 'website',
  },
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <Providers>
      <html lang="en" className={`${display.variable} ${body.variable}`}>
        <head></head>
        <body suppressHydrationWarning className="antialiased">
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              style: {
                background: '#2E1F17',
                color: '#F7F1E6',
                borderRadius: '999px',
                padding: '10px 18px',
                fontSize: '0.92rem',
              },
              iconTheme: { primary: '#E8A93C', secondary: '#2E1F17' },
            }}
          />
          {children}
        </body>
      </html>
    </Providers>
  )
}
