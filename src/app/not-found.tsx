import { Metadata } from 'next'
import Link from 'next/link'
import CandleArt from '@/components/store/CandleArt'

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The page you are looking for does not exist.',
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-soot px-5 text-center text-ivory">
      <CandleArt shape="pillar" wax="#EFE3CB" vessel="#EFE3CB" className="h-40 w-auto" />
      <h1 className="mt-6 text-5xl italic md:text-6xl">This page has burned out</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-wax/80">
        The link is broken or the page has moved. The candles are still where you
        left them.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-light">
          Go to homepage
        </Link>
        <Link
          href="/shop"
          className="btn border border-wax/40 text-ivory hover:border-ember hover:text-ember"
        >
          Shop all candles
        </Link>
      </div>
    </main>
  )
}
