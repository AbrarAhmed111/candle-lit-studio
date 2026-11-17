'use client'

import { useAdmin } from '@/components/admin/AdminData'
import { Loading, PageHeader } from '@/components/admin/ui'
import CodPayments from '@/components/admin/payments/CodPayments'
import EasypaisaPayments from '@/components/admin/payments/EasypaisaPayments'

export default function AdminPaymentsPage() {
  const { orders } = useAdmin()
  return (
    <>
      <PageHeader title="Payments" text="Check each Easypaisa payment against your account, then approve it." />
      {orders ? (
        <>
          <EasypaisaPayments />
          <CodPayments />
        </>
      ) : (
        <div className="mt-8">
          <Loading />
        </div>
      )}
    </>
  )
}
