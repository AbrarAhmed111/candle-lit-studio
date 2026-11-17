import '../assets/css/globals.css' // CSS is now included here
import type { Metadata } from 'next'
import { Bodoni_Moda, Hanken_Grotesk } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ReactNode } from 'react'
import Providers from '@/store/Providers'
import { loadCatalog } from '@/lib/catalog/server'
import { seo } from '@/data/content'
import { store } from '@/data/store'
import { supabaseUrl } from '@/lib/supabase/config'

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

// Title and description come from Dashboard > Website (SEO)
export async function generateMetadata(): Promise<Metadata> {
  await loadCatalog()
  return {
    // Set NEXT_PUBLIC_SITE_URL to the live domain so shared links resolve
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: {
      default: seo.title,
      template: `%s | ${store.name}`,
    },
    description: seo.description,
    openGraph: {
      siteName: store.name,
      locale: 'en_PK',
      type: 'website',
    },
  }
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <Providers>
      <html lang="en" className={`${display.variable} ${body.variable}`}>
        <head>
          {/* Open connections early to where photos and data come from */}
          <link rel="preconnect" href="https://images.unsplash.com" />
          {supabaseUrl && <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />}
        </head>
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
