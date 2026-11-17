'use client'

import { FormEvent, useState } from 'react'
import clsx from 'clsx'
import { useAdmin, type MessageTemplate } from '@/components/admin/AdminData'
import { card, done, PageHeader } from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import ContactInbox from '@/components/admin/ContactInbox'
import EmailLog, { EmailStatus, useEmailOverview } from '@/components/admin/EmailLog'
import { placeholders } from '@/lib/email/render'
import HowItWorks from '@/components/admin/HowItWorks'
import Switch from '@/components/ui/Switch'

// Placeholders the owner can use, with the sample shown in the preview
const variables = placeholders

const fill = (text: string, storeName: string) =>
  [...variables, ['store_name', storeName] as [string, string]].reduce(
    (out, [key, value]) => out.split(`{{${key}}}`).join(value),
    text,
  )

export default function AdminMessagesPage() {
  const { templates, settings, setShop } = useAdmin()
  const email = useEmailOverview()
  const [editing, setEditing] = useState<string | null>(null)
  const shown = templates.filter(t => t.channel === 'email')
  const current = templates.find(t => t.id === editing)

  const toggle = (t: MessageTemplate) => {
    setShop('templates', list => list.map(x => (x.id === t.id ? { ...x, active: !x.active } : x)))
    done(`${t.name} email switched ${t.active ? 'off' : 'on'}`)
  }

  return (
    <>
      <PageHeader
        title="Messages"
        text="Customer messages from the Contact page, and the automatic messages sent about orders."
      />
      <HowItWorks id="messages">
        <p>
          The <strong>Inbox</strong> holds messages from the Contact page. Reply by WhatsApp, call or email, then mark
          them answered.
        </p>
        <p>Below are the automatic emails. Switch each one on or off and change its wording.</p>
      </HowItWorks>
      <ContactInbox />

      <h2 className="mt-14 text-3xl">Automatic emails</h2>
      <EmailStatus live={email.live} overview={email.overview} />

      <ul className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shown.map(t => (
          <li key={t.id} className={`${card} flex flex-col p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl">{t.name}</h2>
                <p className="mt-1 text-sm text-umber">
                  To the {t.to.toLowerCase()}. {t.trigger}.
                </p>
              </div>
              <Switch checked={t.active} onChange={() => toggle(t)} label={`Send ${t.name}`} />
            </div>
            <div className="mt-4 flex-1 rounded-xl bg-wax/50 p-4 text-[0.95rem]">
              {t.subject && <p className="mb-2 font-medium">{fill(t.subject, settings.name)}</p>}
              <p className="line-clamp-4 whitespace-pre-line text-umber">{fill(t.body, settings.name)}</p>
            </div>
            <button type="button" onClick={() => setEditing(t.id)} className="link mt-3 min-h-11 self-start text-sm">
              Edit wording
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(current)}
        onClose={() => setEditing(null)}
        label="Edit message"
        className="max-w-3xl rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        {current && <TemplateForm key={current.id} template={current} onDone={() => setEditing(null)} />}
      </Modal>

      {email.live && <EmailLog overview={email.overview} reload={email.reload} />}
    </>
  )
}

function TemplateForm({ template, onDone }: { template: MessageTemplate; onDone: () => void }) {
  const { settings, setShop } = useAdmin()
  const [subject, setSubject] = useState(template.subject ?? '')
  const [body, setBody] = useState(template.body)
  const [error, setError] = useState('')
  const isEmail = template.channel === 'email'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (isEmail && subject.trim().length < 3) return setError('Enter a subject line.')
    if (body.trim().length < 10) return setError('Write the message, at least 10 characters.')
    const unknown = [...body.matchAll(/\{\{(\w+)\}\}/g), ...subject.matchAll(/\{\{(\w+)\}\}/g)]
      .map(m => m[1])
      .find(name => name !== 'store_name' && !variables.some(([key]) => key === name))
    if (unknown) return setError(`{{${unknown}}} is not a placeholder we can fill. Use one from the list.`)
    setShop('templates', list =>
      list.map(t =>
        t.id === template.id
          ? {
              ...t,
              subject: isEmail ? subject.trim() : undefined,
              body: body.trim(),
            }
          : t,
      ),
    )
    done(`${template.name} email wording saved`)
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{template.name}</h2>
      <p className="mt-1 text-umber">
        {isEmail ? 'Email' : 'WhatsApp'} to the {template.to.toLowerCase()}. {template.trigger}.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          {isEmail && (
            <>
              <label htmlFor="tpl-subject" className="field-label">
                Subject
              </label>
              <input
                id="tpl-subject"
                value={subject}
                onChange={e => {
                  setSubject(e.target.value)
                  setError('')
                }}
                className="field"
              />
            </>
          )}
          <label htmlFor="tpl-body" className={clsx('field-label', isEmail && 'mt-4')}>
            Message
          </label>
          <textarea
            id="tpl-body"
            rows={9}
            value={body}
            onChange={e => {
              setBody(e.target.value)
              setError('')
            }}
            className="field py-3"
          />
          <p className="mt-3 text-sm text-umber">
            Tap a placeholder to add it. It is replaced with the real value when sent.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...variables.map(([key]) => key), 'store_name'].map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setBody(b => `${b}{{${key}}}`)}
                className="min-h-9 rounded-full border border-hairline px-3 text-sm hover:border-espresso"
              >
                {key.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="field-label">Preview with a sample order</p>
          <div
            className={clsx(
              'rounded-2xl p-4 text-[0.95rem]',
              isEmail ? 'border border-hairline bg-linen' : 'bg-[#E7F8E1]',
            )}
          >
            {isEmail && (
              <p className="mb-3 border-b border-hairline pb-3 font-medium">{fill(subject, settings.name)}</p>
            )}
            <p className="whitespace-pre-line break-words">{fill(body, settings.name)}</p>
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary">
          Save wording
        </button>
        <button type="button" onClick={onDone} className="btn-outline">
          Discard
        </button>
      </div>
    </form>
  )
}
