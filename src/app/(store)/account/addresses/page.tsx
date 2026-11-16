'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAccount, type Address } from '@/components/account/useAccount'
import Modal from '@/components/store/Modal'
import { cities } from '@/data/store'
import { normalisePkMobile } from '@/lib/pricing'

type Draft = Omit<Address, 'id' | 'isDefault'>

const blank: Draft = { label: 'Home', name: '', phone: '', address: '', area: '', city: cities[0], landmark: '' }

export default function AccountAddresses() {
  const { account, update } = useAccount()
  // 'new', an address id, or null when the form is closed
  const [editing, setEditing] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Address | null>(null)
  const current = account.addresses.find(a => a.id === editing)

  const save = (draft: Draft) => {
    update(a => {
      if (editing === 'new') {
        const id = `a${Date.now()}`
        return { ...a, addresses: [...a.addresses, { ...draft, id, isDefault: a.addresses.length === 0 }] }
      }
      return { ...a, addresses: a.addresses.map(x => (x.id === editing ? { ...x, ...draft } : x)) }
    })
    toast.success(editing === 'new' ? 'Address added' : 'Address updated')
    setEditing(null)
  }

  const remove = () => {
    if (!removing) return
    update(a => {
      const rest = a.addresses.filter(x => x.id !== removing.id)
      // Deleting the default hands the role to the next address
      if (removing.isDefault && rest[0]) rest[0] = { ...rest[0], isDefault: true }
      return { ...a, addresses: rest }
    })
    toast.success('Address deleted')
    setRemoving(null)
  }

  const makeDefault = (id: string) => {
    update(a => ({ ...a, addresses: a.addresses.map(x => ({ ...x, isDefault: x.id === id })) }))
    toast.success('Default address changed')
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl lg:text-6xl">Addresses</h1>
          <p className="mt-3 text-lg text-umber">Saved addresses fill in checkout for you.</p>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary">
          <Plus size={17} /> Add address
        </button>
      </div>

      {account.addresses.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-hairline bg-linen p-10 text-center">
          <p className="font-display text-2xl">No saved addresses</p>
          <p className="mt-2 text-umber">Add one now and skip the typing at checkout.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {account.addresses.map(a => (
            <li key={a.id} className="flex flex-col rounded-2xl border border-hairline bg-linen p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl">{a.label}</h2>
                {a.isDefault && (
                  <span className="rounded-full bg-sage/15 px-2.5 py-1 text-sm font-medium text-sage">Default</span>
                )}
              </div>
              <address className="mt-3 flex-1 not-italic text-umber">
                <span className="text-espresso">{a.name}</span>
                <br />
                {a.address}
                <br />
                {a.area}, {a.city}
                {a.landmark && (
                  <>
                    <br />
                    Near {a.landmark}
                  </>
                )}
                <br />
                {a.phone}
              </address>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <button type="button" onClick={() => setEditing(a.id)} className="link min-h-11">
                  Edit
                </button>
                {!a.isDefault && (
                  <button type="button" onClick={() => makeDefault(a.id)} className="link min-h-11">
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => setRemoving(a)} className="min-h-11 text-wine underline decoration-1 underline-offset-4">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        label={editing === 'new' ? 'Add address' : 'Edit address'}
        className="max-w-lg rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        {editing !== null && (
          <AddressForm
            key={editing}
            title={editing === 'new' ? 'Add address' : 'Edit address'}
            initial={current ?? { ...blank, name: account.profile.name, phone: account.profile.phone }}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        label="Delete address"
        className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        <h2 className="pr-10 text-3xl">Delete this address?</h2>
        <p className="mt-2 text-umber">
          {removing?.label}: {removing?.address}, {removing?.area}, {removing?.city}. Past orders keep their
          delivery details.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={remove} className="btn flex-1 bg-wine text-ivory before:bg-espresso">
            Delete address
          </button>
          <button type="button" onClick={() => setRemoving(null)} className="btn-outline">
            Keep it
          </button>
        </div>
      </Modal>
    </>
  )
}

function AddressForm({
  title,
  initial,
  onSave,
  onCancel,
}: {
  title: string
  initial: Draft
  onSave: (draft: Draft) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<Draft>({ ...initial, landmark: initial.landmark ?? '' })
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found: typeof errors = {}
    const phone = normalisePkMobile(values.phone)
    if (values.name.trim().length < 3) found.name = 'Enter the full name of the person receiving the parcel.'
    if (!phone) found.phone = 'Enter a Pakistani mobile number like 0300 1234567.'
    if (values.address.trim().length < 5) found.address = 'Enter the house or flat number and street.'
    if (values.area.trim().length < 2) found.area = 'Enter the area, sector or town.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSave({
      ...values,
      label: values.label.trim() || 'Address',
      name: values.name.trim(),
      phone: phone!,
      address: values.address.trim(),
      area: values.area.trim(),
      landmark: values.landmark?.trim() || undefined,
    })
  }

  const bind = (key: keyof Draft) => ({
    id: `addr-${key}`,
    value: values[key] ?? '',
    'aria-invalid': !!errors[key],
    className: 'field',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues(v => ({ ...v, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: undefined }))
    },
  })

  const field = (key: keyof Draft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`addr-${key}`} className="field-label">
        {label}
      </label>
      <input {...bind(key)} {...props} />
      {errors[key] && <p className="field-error">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {field('label', 'Label, for example Home')}
        {field('name', 'Full name', { autoComplete: 'name' })}
        {field('phone', 'Mobile number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
        <div>
          <label htmlFor="addr-city" className="field-label">
            City
          </label>
          <select {...bind('city')}>
            {cities.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">{field('address', 'House or flat, street', { autoComplete: 'street-address' })}</div>
        {field('area', 'Area, sector or town')}
        {field('landmark', 'Nearby landmark (optional)')}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary flex-1">
          Save address
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Discard
        </button>
      </div>
    </form>
  )
}
