'use client'

import { FormEvent, useState } from 'react'
import { sendContactMessage } from '@/lib/actions/store'
import Honeypot from './Honeypot'

export default function ContactForm() {
  const [values, setValues] = useState({ name: '', contact: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)

  const [sending, setSending] = useState(false)
  const [trap, setTrap] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (values.name.trim().length < 2) found.name = 'Enter your name.'
    if (values.contact.trim().length < 6)
      found.contact = 'Enter a mobile number or email so we can reply.'
    if (values.message.trim().length < 10)
      found.message = 'Tell us a little more, at least 10 characters.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    // A bot filled the hidden field: show success and send nothing
    if (trap) return setSent(true)
    setSending(true)
    const result = await sendContactMessage(values)
    setSending(false)
    if (!result.ok) return setErrors({ message: result.error })
    setSent(true)
  }

  if (sent) {
    return (
      <div role="status" className="border-t border-espresso pt-6">
        <h2 className="text-3xl italic">Message sent</h2>
        <p className="mt-3 text-umber">
          Thank you, {values.name.trim().split(' ')[0]}. We reply within one working
          day.
        </p>
      </div>
    )
  }

  const bind = (key: keyof typeof values) => ({
    id: key,
    name: key,
    value: values[key],
    'aria-invalid': !!errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues(v => ({ ...v, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: '' }))
    },
  })

  return (
    <form onSubmit={submit} noValidate className="relative space-y-5">
      <div>
        <label htmlFor="name" className="field-label">
          Your name
        </label>
        <input {...bind('name')} autoComplete="name" className="field" />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="contact" className="field-label">
          Mobile number or email
        </label>
        <input {...bind('contact')} className="field" />
        {errors.contact && <p className="field-error">{errors.contact}</p>}
      </div>
      <div>
        <label htmlFor="message" className="field-label">
          How can we help?
        </label>
        <textarea {...bind('message')} rows={5} className="field py-3" />
        {errors.message && <p className="field-error">{errors.message}</p>}
      </div>
      <Honeypot value={trap} onChange={setTrap} />
      <button type="submit" disabled={sending} className="btn-primary">
        {sending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
