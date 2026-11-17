'use client'

import { useState } from 'react'
import { useAdmin } from '../AdminData'
import { done } from '../ui'
import Modal from '@/components/store/Modal'
import { formatPKR } from '@/lib/pricing'
import type { AdminOrder } from '@/data/admin'

const reasons = [
  'Customer asked to cancel',
  'Customer did not answer the confirmation calls',
  'Out of stock',
  'Duplicate order',
  'Address outside delivery area',
]

/** Cancels an order with a reason. The stock goes back on the shelf. */
export default function CancelDialog({
  order,
  open,
  onClose,
}: {
  order: AdminOrder
  open: boolean
  onClose: () => void
}) {
  const { updateOrder } = useAdmin()
  const [reason, setReason] = useState(reasons[0])

  const confirm = () => {
    updateOrder(order.number, { status: 'Cancelled', cancelReason: `${reason}.` }, `Order cancelled. ${reason}.`)
    done(`${order.number} cancelled`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      label="Cancel order"
      className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
    >
      <h2 className="pr-10 text-3xl">Cancel {order.number}?</h2>
      <p className="mt-2 text-umber">
        The order for {order.customer.name}, worth {formatPKR(order.total)}, will be marked cancelled. This cannot be
        undone here.
      </p>
      <label htmlFor="reason" className="field-label mt-6">
        Reason
      </label>
      <select id="reason" value={reason} onChange={e => setReason(e.target.value)} className="field">
        {reasons.map(r => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={confirm} className="btn flex-1 bg-wine text-ivory before:bg-espresso">
          Cancel order
        </button>
        <button type="button" onClick={onClose} className="btn-outline">
          Keep order
        </button>
      </div>
    </Modal>
  )
}
