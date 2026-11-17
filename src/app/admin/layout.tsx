import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminDataProvider } from '@/components/admin/AdminData'
import AdminShell from '@/components/admin/AdminShell'
import { getCurrentUser, getStaffAccess } from '@/lib/auth'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin | Candle Lit Studio' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Demo mode: both are null and the dashboard opens for everyone
  const [user, access] = await Promise.all([getCurrentUser(), getStaffAccess()])
  const viewer = user
    ? {
        name: access?.name || (user.user_metadata?.full_name as string) || user.email || 'Team member',
        email: user.email ?? '',
        role: access?.role ?? 'Manager',
        modules: access?.modules ?? [],
      }
    : null

  return (
    <AdminDataProvider>
      <AdminShell viewer={viewer}>{children}</AdminShell>
    </AdminDataProvider>
  )
}
