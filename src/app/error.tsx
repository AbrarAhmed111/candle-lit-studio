'use client'

import * as React from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ivory px-5 text-center">
      <h1 className="text-5xl italic md:text-6xl">Something went wrong</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-umber">
        This page failed to load. Try again, or go back to the homepage. Your cart
        is safe.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={() => reset()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-outline">
          Go to homepage
        </Link>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mx-auto mt-8 max-w-2xl text-left">
          <summary className="cursor-pointer text-sm text-umber">
            Error details (development)
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-soot p-4 text-xs text-ember">
            {error.message}
          </pre>
        </details>
      )}
    </main>
  )
}
