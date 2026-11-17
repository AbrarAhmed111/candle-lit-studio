'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'
import clsx from 'clsx'
import { modules, useAdmin, type TeamMember } from '@/components/admin/AdminData'
import { card, done, PageHeader } from '@/components/admin/ui'
import { adminInviteTeamMember } from '@/lib/actions/admin'
import toast from 'react-hot-toast'
import Modal from '@/components/store/Modal'

export default function AdminTeamPage() {
  const { team, setShop, live } = useAdmin()
  const [sending, setSending] = useState<string | null>(null)

  /** Emails the person a link to the dashboard */
  const invite = async (m: TeamMember) => {
    if (!live) return
    setSending(m.id)
    const result = await adminInviteTeamMember({ name: m.name, email: m.email, role: m.role, modules: m.modules })
    setSending(null)
    if (result.ok) toast.success(`Invite emailed to ${m.email}`)
    else toast.error(result.error, { duration: 8000 })
  }
  const [editing, setEditing] = useState<string | null>(null) // 'new' or a member id
  const current = team.find(m => m.id === editing)
  const admins = team.filter(m => m.role === 'Administrator' && m.active).length

  return (
    <>
      <PageHeader title="Team" text="Who can open the dashboard, and which parts of it.">
        <button type="button" onClick={() => setEditing('new')} className="btn-primary">
          <Plus size={17} /> Add team member
        </button>
      </PageHeader>
      <p className="mt-6 rounded-2xl bg-wax/60 px-4 py-3 text-[0.95rem] text-umber">
        When you add someone, they get an email invite. They open the dashboard by signing in with that same email
        address, with Google or with a password.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {team.map(m => (
          <li key={m.id} className={clsx(card, 'p-5 sm:p-6', !m.active && 'opacity-70')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-wax font-display text-xl">
                  {m.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <h2 className="text-2xl">{m.name}</h2>
                  <p className="truncate text-sm text-umber">{m.email}</p>
                </div>
              </div>
              <span
                className={clsx(
                  'shrink-0 rounded-full px-2.5 py-1 text-sm font-medium',
                  !m.active
                    ? 'bg-wine/10 text-wine'
                    : m.role === 'Administrator'
                      ? 'bg-espresso text-ivory'
                      : 'bg-wax text-espresso',
                )}
              >
                {m.active ? m.role : 'Access off'}
              </span>
            </div>
            <p className="mt-4 text-sm text-umber">Can open</p>
            <p className="mt-1">
              {m.role === 'Administrator'
                ? 'Everything, including team and settings'
                : m.modules.join(', ') || 'Nothing yet'}
            </p>
            {live && m.active && !m.joined && <p className="mt-3 text-sm text-toffee">Has not signed in yet.</p>}
            <div className="mt-3 flex flex-wrap gap-x-5">
              <button type="button" onClick={() => setEditing(m.id)} className="link min-h-11 text-sm">
                Edit access
              </button>
              {live && m.active && !m.joined && (
                <button
                  type="button"
                  disabled={sending === m.id}
                  onClick={() => invite(m)}
                  className="link min-h-11 text-sm"
                >
                  {sending === m.id ? 'Sending…' : 'Send invite again'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        label="Team member"
        className="max-w-lg rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        {editing !== null && (
          <MemberForm
            key={editing}
            member={current}
            // The last active administrator cannot be demoted, switched off or removed
            locked={Boolean(current && current.role === 'Administrator' && current.active && admins === 1)}
            taken={team.filter(m => m.id !== editing).map(m => m.email.toLowerCase())}
            onSave={member => {
              const isNew = !current
              const emailChanged = current && current.email !== member.email
              setShop('team', list =>
                list.some(m => m.id === member.id)
                  ? list.map(m => (m.id === member.id ? { ...member, joined: emailChanged ? false : m.joined } : m))
                  : [...list, member],
              )
              done(isNew ? `${member.name} added to the team as ${member.role}` : `Access updated for ${member.name}`)
              setEditing(null)
              // New people, or a new email address, get an invite
              if ((isNew || emailChanged) && member.active) invite(member)
            }}
            onRemove={() => {
              setShop('team', list => list.filter(m => m.id !== current!.id))
              done(`${current!.name} removed from the team`)
              setEditing(null)
            }}
          />
        )}
      </Modal>
    </>
  )
}

function MemberForm({
  member,
  locked,
  taken,
  onSave,
  onRemove,
}: {
  member?: TeamMember
  locked: boolean
  taken: string[]
  onSave: (member: TeamMember) => void
  onRemove: () => void
}) {
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [role, setRole] = useState<TeamMember['role']>(member?.role ?? 'Manager')
  const [allowed, setAllowed] = useState<string[]>(member?.modules ?? ['Orders'])
  const [active, setActive] = useState(member?.active ?? true)
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (name.trim().length < 2) return setError('Enter the person’s name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError('Enter an email address like name@example.com.')
    if (taken.includes(cleanEmail)) return setError('Someone on the team already uses this email.')
    if (role === 'Manager' && allowed.length === 0)
      return setError('Choose at least one part of the dashboard for a manager.')
    onSave({
      id: member?.id ?? `t${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role,
      modules: role === 'Administrator' ? [...modules] : allowed,
      active,
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{member ? `Edit ${member.name}` : 'Add team member'}</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="field-label mb-0">
          Name
          <input
            value={name}
            onChange={e => {
              setName(e.target.value)
              setError('')
            }}
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Email they sign in with
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              setError('')
            }}
            className="field mt-1.5"
          />
        </label>
      </div>

      <fieldset className="mt-5" disabled={locked}>
        <legend className="field-label">Role</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ['Manager', 'Opens only the parts you choose.'],
              ['Administrator', 'Opens everything, including team and settings.'],
            ] as const
          ).map(([value, text]) => (
            <label
              key={value}
              className={clsx(
                'cursor-pointer rounded-xl border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-caramel',
                role === value ? 'border-espresso bg-wax/60' : 'border-hairline hover:border-espresso',
              )}
            >
              <input
                type="radio"
                name="role"
                className="sr-only"
                checked={role === value}
                onChange={() => setRole(value)}
              />
              <span className="font-medium">{value}</span>
              <span className="block text-sm text-umber">{text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {role === 'Manager' && (
        <fieldset className="mt-5">
          <legend className="field-label">Can open</legend>
          <div className="flex flex-wrap gap-2">
            {modules.map(m => {
              const on = allowed.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setAllowed(list => (on ? list.filter(x => x !== m) : [...list, m]))
                    setError('')
                  }}
                  className={clsx(
                    'min-h-11 rounded-full border px-4 text-sm transition-colors',
                    on ? 'border-espresso bg-espresso text-ivory' : 'border-hairline hover:border-espresso',
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {member && (
        <label className={clsx('mt-5 flex min-h-11 items-center gap-3', locked ? 'text-umber' : 'cursor-pointer')}>
          <input
            type="checkbox"
            checked={active}
            disabled={locked}
            onChange={e => setActive(e.target.checked)}
            className="h-5 w-5 accent-caramel"
          />
          Can sign in
        </label>
      )}
      {locked && (
        <p className="mt-2 text-sm text-umber">
          This is the only administrator, so the role and access cannot be changed. Add another administrator first.
        </p>
      )}

      {error && (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary flex-1">
          {member ? 'Save access' : 'Add to team'}
        </button>
        {member && !locked && (
          <button
            type="button"
            onClick={onRemove}
            className="btn border border-wine text-wine before:bg-wine hover:text-ivory"
          >
            Remove
          </button>
        )}
      </div>
    </form>
  )
}
