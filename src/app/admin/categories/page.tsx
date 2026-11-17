'use client'

import { FormEvent, useState } from 'react'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useAdmin } from '@/components/admin/AdminData'
import { card, Empty, PageHeader, done } from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import type { Category } from '@/types'

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function AdminCategoriesPage() {
  const { categories, products, setShop } = useAdmin()
  // 'new', a slug, or null when the form is closed
  const [editing, setEditing] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Category | null>(null)
  const current = categories.find(c => c.slug === editing)
  const count = (slug: string) => products.filter(p => p.categories.includes(slug)).length

  const move = (index: number, by: number) =>
    setShop('categories', list => {
      const next = [...list]
      ;[next[index], next[index + by]] = [next[index + by], next[index]]
      return next
    })

  const save = (name: string, description: string) => {
    if (editing === 'new') {
      setShop('categories', list => [...list, { slug: slugify(name), name, description, cover: '' }])
      done(`${name} added`)
    } else {
      setShop('categories', list => list.map(c => (c.slug === editing ? { ...c, name, description } : c)))
      done(`${name} saved`)
    }
    setEditing(null)
  }

  const remove = () => {
    if (!removing) return
    setShop('categories', list => list.filter(c => c.slug !== removing.slug))
    done(`${removing.name} deleted`)
    setRemoving(null)
  }

  return (
    <>
      <PageHeader title="Categories" text="The order here is the order customers see in the store menu.">
        <button type="button" onClick={() => setEditing('new')} className="btn-primary">
          <Plus size={17} /> Add category
        </button>
      </PageHeader>

      <div className={`${card} mt-8 overflow-hidden`}>
        {categories.length === 0 ? (
          <Empty title="No categories yet" text="Add one to start grouping your candles." />
        ) : (
          <ul className="divide-y divide-hairline">
            {categories.map((c, i) => (
              <li key={c.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
                <div className="flex shrink-0">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${c.name} up`} className="grid h-11 w-9 place-items-center rounded-lg hover:bg-wax disabled:opacity-30">
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" disabled={i === categories.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${c.name} down`} className="grid h-11 w-9 place-items-center rounded-lg hover:bg-wax disabled:opacity-30">
                    <ArrowDown size={16} />
                  </button>
                </div>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-umber">{c.description}</p>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-umber">
                  {count(c.slug)} {count(c.slug) === 1 ? 'product' : 'products'}
                </p>
                <div className="flex shrink-0 gap-4 text-sm">
                  <button type="button" onClick={() => setEditing(c.slug)} className="link min-h-11">
                    Edit
                  </button>
                  <button type="button" onClick={() => setRemoving(c)} className="min-h-11 text-wine underline decoration-1 underline-offset-4">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} label={editing === 'new' ? 'Add category' : 'Edit category'} className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8">
        {editing !== null && (
          <CategoryForm
            key={editing}
            title={editing === 'new' ? 'Add category' : 'Edit category'}
            initial={current}
            taken={categories.filter(c => c.slug !== editing).map(c => c.slug)}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={removing !== null} onClose={() => setRemoving(null)} label="Delete category" className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8">
        <h2 className="pr-10 text-3xl">Delete {removing?.name}?</h2>
        {removing && count(removing.slug) > 0 ? (
          <>
            <p className="mt-2 text-umber">
              {count(removing.slug)} products are in this category. Move them to another category first, then delete it.
            </p>
            <button type="button" onClick={() => setRemoving(null)} className="btn-primary mt-6 w-full">
              Got it
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-umber">No products use it. This cannot be undone.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={remove} className="btn flex-1 bg-wine text-ivory before:bg-espresso">
                Delete category
              </button>
              <button type="button" onClick={() => setRemoving(null)} className="btn-outline">
                Keep it
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

function CategoryForm({
  title,
  initial,
  taken,
  onSave,
  onCancel,
}: {
  title: string
  initial?: Category
  taken: string[]
  onSave: (name: string, description: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (clean.length < 2) return setError('Enter a category name.')
    if (!initial && taken.includes(slugify(clean))) return setError('A category with this name already exists.')
    onSave(clean, description.trim())
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{title}</h2>
      <label htmlFor="cat-name" className="field-label mt-6">
        Name
      </label>
      <input
        id="cat-name"
        value={name}
        onChange={e => {
          setName(e.target.value)
          setError('')
        }}
        aria-invalid={!!error}
        className="field"
      />
      {error && <p className="field-error">{error}</p>}
      <label htmlFor="cat-desc" className="field-label mt-4">
        Description, shown at the top of the category page
      </label>
      <textarea id="cat-desc" rows={3} value={description} onChange={e => setDescription(e.target.value)} className="field py-3" />
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary flex-1">
          Save category
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Discard
        </button>
      </div>
    </form>
  )
}
