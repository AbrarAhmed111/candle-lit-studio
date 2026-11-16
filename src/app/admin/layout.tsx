import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminDataProvider } from '@/components/admin/AdminData'
import AdminShell from '@/components/admin/AdminShell'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin | Candle Lit Studio' },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminDataProvider>
      <AdminShell>{children}</AdminShell>
    </AdminDataProvider>
  )
}
