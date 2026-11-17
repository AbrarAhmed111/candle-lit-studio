import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AccountNav from '@/components/account/AccountNav'
import Link from 'next/link'
import { ArrowUpRight, LayoutDashboard } from 'lucide-react'
import { getStaffAccess } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
}

export default async function AccountLayout({ children }: { children: ReactNode }) {
  // Team members also shop here, but their main job is the dashboard
  const staff = await getStaffAccess()

  return (
    <div className="page pt-8 lg:pt-12">
      {staff && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-espresso p-5 text-ivory sm:p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ember text-soot">
              <LayoutDashboard size={22} />
            </span>
            <div>
              <p className="font-display text-2xl italic leading-tight">
                Signed in as {staff.role === 'Administrator' ? 'store administrator' : 'store manager'}
              </p>
              <p className="mt-1 text-sm text-wax/80">
                {staff.role === 'Administrator'
                  ? 'Orders, products, discounts and settings are in the dashboard.'
                  : `You can manage ${staff.modules.length ? staff.modules.join(', ').toLowerCase() : 'the overview'} in the dashboard.`}
              </p>
            </div>
          </div>
          <Link href="/admin" className="btn-light">
            Open dashboard <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
          <AccountNav staff={!!staff} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
