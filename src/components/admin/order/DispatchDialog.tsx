'use client'

import { FormEvent, useState } from 'react'
import { useAdmin } from '../AdminData'
import { done } from '../ui'
import Modal from '@/components/store/Modal'
import type { AdminOrder } from '@/data/admin'

const OTHER = '__other__'

/** Adds or corrects the courier and tracking ID */
export default function DispatchDialog({
  order,
  open,
  onClose,
}: {
  order: AdminOrder
  open: boolean
  onClose: () => void
}) {
  const { updateOrder, settings } = useAdmin()
  // Couriers switched on in Settings, plus the one already on this order
  const couriers = settings.couriers.filter(c => c.active || c.name === order.shipment?.courier)
  const [courier, setCourier] = useState(order.shipment?.courier ?? couriers[0]?.name ?? '')
  const [trackingId, setTrackingId] = useState(order.shipment?.trackingId ?? '')
  const [otherName, setOtherName] = useState('')
  const [otherUrl, setOtherUrl] = useState('')
  const [notes, setNotes] = useState(order.shipment?.notes ?? '')
  const [error, setError] = useState('')
  const other = courier === OTHER
  const editing = Boolean(order.shipment)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const id = trackingId.trim()
    if (!courier) return setError('Choose a courier.')
    if (other && otherName.trim().length < 2) return setError('Type the courier company name.')
    if (id.length < 4) return setError('Enter the tracking ID from the courier slip.')
    const name = other ? otherName.trim() : courier
    const template = other ? otherUrl.trim() : (couriers.find(c => c.name === courier)?.trackingUrl ?? '')
    // A link with {tracking} in it gets the tracking ID filled in
    const trackingUrl = template.includes('{tracking}')
      ? template.replace('{tracking}', encodeURIComponent(id))
      : template
    updateOrder(
      order.number,
      {
        status: editing ? order.status : 'Dispatched',
        shipment: {
          courier: name,
          trackingId: id,
          trackingUrl,
          dispatchedAt: order.shipment?.dispatchedAt ?? new Date().toISOString(),
          notes: notes.trim() || undefined,
        },
      },
      editing ? `Shipment updated: ${name}, tracking ${id}` : `Dispatched with ${name}, tracking ${id}`,
    )
    done(editing ? 'Shipment updated' : `${order.number} dispatched`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={editing ? 'Edit shipment' : 'Dispatch order'}
      className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
    >
      <form onSubmit={submit} noValidate>
        <h2 className="pr-10 text-3xl">{editing ? 'Edit shipment' : `Dispatch ${order.number}`}</h2>
        <p className="mt-2 text-umber">
          {editing
            ? 'Correct the courier or tracking ID. The change is recorded in the order history.'
            : 'The customer sees the courier and tracking ID on their order page.'}
        </p>
        <label htmlFor="courier" className="field-label mt-6">
          Courier
        </label>
        <select id="courier" value={courier} onChange={e => setCourier(e.target.value)} className="field">
          {couriers.map(c => (
            <option key={c.name}>{c.name}</option>
          ))}
          <option value={OTHER}>Another courier…</option>
        </select>
        {other && (
          <div className="mt-3 grid grid-cols-1 gap-3">
            <input
              value={otherName}
              onChange={e => setOtherName(e.target.value)}
              placeholder="Courier name"
              aria-label="Courier name"
              className="field"
            />
            <input
              value={otherUrl}
              onChange={e => setOtherUrl(e.target.value)}
              placeholder="Tracking website (optional)"
              aria-label="Tracking website"
              className="field"
            />
          </div>
        )}
        <label htmlFor="tracking" className="field-label mt-4">
          Tracking ID
        </label>
        <input
          id="tracking"
          value={trackingId}
          onChange={e => {
            setTrackingId(e.target.value)
            setError('')
          }}
          aria-invalid={!!error}
          aria-describedby={error ? 'tracking-error' : undefined}
          className="field"
        />
        {error && (
          <p id="tracking-error" className="field-error">
            {error}
          </p>
        )}
        <label htmlFor="ship-notes" className="field-label mt-4">
          Note for your team <span className="font-normal text-umber">(optional)</span>
        </label>
        <input
          id="ship-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="For example: booked at the Jinnah Road branch"
          className="field"
        />
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary flex-1">
            {editing ? 'Save shipment' : 'Dispatch order'}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            Not now
          </button>
        </div>
      </form>
    </Modal>
  )
}
