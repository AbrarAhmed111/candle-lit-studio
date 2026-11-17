'use client'

import Link from 'next/link'
import { useState } from 'react'
import clsx from 'clsx'
import { useAdmin } from '@/components/admin/AdminData'
import { card, dateTime, done, Empty, Kpi, PaymentBadge, td, th } from '@/components/admin/ui'
import HowItWorks from '@/components/admin/HowItWorks'
import { formatPKR } from '@/lib/pricing'
import type { PaymentStatus } from '@/types'

const tabs: { key: PaymentStatus; label: string }[] = [
  { key: 'Pending Verification', label: 'To check' },
  { key: 'Payment Rejected', label: 'Rejected, waiting for the customer' },
  { key: 'Paid', label: 'Paid' },
]

/** Easypaisa transfers: check each one against the account, then approve or reject it */
export default function EasypaisaPayments() {
  const { orders, reviewPayment } = useAdmin()
  const [tab, setTab] = useState<PaymentStatus>('Pending Verification')
  if (!orders) return null

  const easypaisa = orders.filter(o => o.paymentMethod === 'Easypaisa' && o.status !== 'Cancelled')
  const list = (status: PaymentStatus) => easypaisa.filter(o => o.paymentStatus === status)
  const sum = (status: PaymentStatus) => list(status).reduce((t, o) => t + o.total, 0)
  const shown = list(tab)

  return (
    <>
      <HowItWorks id="payments">
        <p>
          Every order is paid by Easypaisa. The customer sends the money to your account, then gives the transaction ID
          and a screenshot at checkout.
        </p>
        <p>
          Open your Easypaisa app and find the payment. If the amount and transaction ID match, press{' '}
          <strong>Approve</strong>. Then confirm the order as usual. If it does not match, open the order and press{' '}
          <strong>Reject payment</strong>: the customer is emailed the reason and can send new details.
        </p>
      </HowItWorks>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          strong
          label="Payments to check"
          value={String(list('Pending Verification').length)}
          hint={formatPKR(sum('Pending Verification'))}
        />
        <Kpi
          label="Waiting for the customer"
          value={String(list('Payment Rejected').length)}
          hint="Rejected, new details due"
        />
        <Kpi label="Received by Easypaisa" value={formatPKR(sum('Paid'))} hint="All time" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Payment status">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={clsx(
              'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
              tab === t.key
                ? 'border-espresso bg-espresso text-ivory'
                : 'border-hairline bg-linen hover:border-espresso',
            )}
          >
            {t.label}
            <span className={clsx('tabular-nums', tab === t.key ? 'text-wax/80' : 'text-umber')}>
              {list(t.key).length}
            </span>
          </button>
        ))}
      </div>

      <div className={`${card} mt-4 overflow-hidden`}>
        {shown.length === 0 ? (
          <Empty
            title={tab === 'Pending Verification' ? 'Nothing to check' : 'Nothing here'}
            text={
              tab === 'Pending Verification' ? 'New Easypaisa payments will appear here.' : 'No orders in this state.'
            }
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[44rem] text-[0.95rem]">
              <thead className="border-b border-hairline bg-wax/50">
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Transaction ID</th>
                  <th className={`${th} text-right`}>Amount due</th>
                  <th className={th}>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {shown.map(o => (
                  <tr key={o.number}>
                    <td className={td}>
                      <Link href={`/admin/orders/${o.number}`} className="font-medium hover:text-caramel">
                        {o.number}
                      </Link>
                      <span className="block text-sm text-umber">
                        {o.payment?.submittedAt ? dateTime(o.payment.submittedAt) : dateTime(o.placedAt)}
                      </span>
                    </td>
                    <td className={td}>
                      {o.customer.name}
                      <span className="block text-sm text-umber">{o.customer.city}</span>
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {o.payment?.reference ?? '-'}
                      {tab === 'Payment Rejected' && o.payment?.rejectionReason && (
                        <span className="block text-sm text-wine">{o.payment.rejectionReason}</span>
                      )}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{formatPKR(o.total)}</td>
                    <td className={`${td} text-right`}>
                      {tab === 'Pending Verification' ? (
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/orders/${o.number}#pay-h`} className="btn-outline min-h-10 px-3 text-sm">
                            See screenshot
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              reviewPayment(o.number, true)
                              done(`${o.number}: payment approved`)
                            }}
                            className="btn-primary min-h-10 px-3 text-sm"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <PaymentBadge status={o.paymentStatus} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
