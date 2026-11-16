import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AccountNav from '@/components/account/AccountNav'

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page pt-8 lg:pt-12">
      <p className="mb-6 rounded-xl bg-wax px-4 py-2.5 text-sm text-umber">
        Demo account. Sign-in is not connected yet, so this shows a sample customer and is saved in
        this browser only.
      </p>
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
