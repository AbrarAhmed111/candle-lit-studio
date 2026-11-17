import type { Order, PaymentStatus } from '@/types'

/*
 * Payment rules. Every new order is paid by Easypaisa, in every city:
 * the customer sends money to the shop's account, then gives the
 * transaction ID and a screenshot. The owner checks it in the dashboard.
 * The database applies the same rules in place_order.
 *
 * Orders placed before this change may still be cash on delivery, so the
 * dashboard keeps the cash statuses for them.
 */

export type PaymentMethod = Order['paymentMethod']

/** Transaction IDs are compared without spaces or dashes, in capitals */
export const cleanReference = (text: string) => text.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

export const validReference = (text: string) => /^[A-Z0-9]{6,30}$/.test(cleanReference(text))

/** Statuses of each payment method, in the order they usually happen */
export const easypaisaStatuses: PaymentStatus[] = ['Pending Verification', 'Paid', 'Payment Rejected']
export const codStatuses: PaymentStatus[] = [
  'Pending Collection',
  'Collected by Courier',
  'Settled to Business',
  'Reconciliation Required',
  'Disputed',
  'Adjusted',
]

/** True while an Easypaisa order is waiting for its payment, so it cannot be confirmed */
export const awaitingPayment = (order: Pick<Order, 'paymentMethod' | 'paymentStatus'>) =>
  order.paymentMethod === 'Easypaisa' && order.paymentStatus !== 'Paid'

/** Accepted screenshot files */
export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PROOF_MAX_BYTES = 5 * 1024 * 1024

/** Plain words for each payment status, shown to customers */
export const paymentStatusText: Partial<Record<PaymentStatus, string>> = {
  'Pending Verification': 'We are checking your Easypaisa payment',
  Paid: 'Paid by Easypaisa',
  'Payment Rejected': 'We could not confirm your payment',
}
