'use client'

import { FormEvent, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Upload } from 'lucide-react'
import { adminUploadImage } from '@/lib/actions/admin'
import { photoUrl } from '@/components/store/ProductPhoto'
import { useAdmin } from '@/components/admin/AdminData'
import { card, Empty, PageHeader, done } from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import type { Category } from '@/types'
import HowItWorks from '@/components/admin/HowItWorks'

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

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

  const save = (category: Category) => {
    if (editing === 'new') {
      setShop('categories', list => [...list, category])
      done(`${category.name} added`)
    } else {
      setShop('categories', list => list.map(c => (c.slug === editing ? category : c)))
      done(`${category.name} saved`)
    }
    setEditing(null)
  }

  const toggleArchive = (c: Category) => {
    setShop('categories', list => list.map(x => (x.slug === c.slug ? { ...x, archived: !x.archived } : x)))
    done(c.archived ? `${c.name} shown in the store again` : `${c.name} hidden from the store`)
    setRemoving(null)
  }
  const parentName = (slug?: string) => categories.find(c => c.slug === slug)?.name

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
      <HowItWorks id="categories">
        <p>
          Categories group your candles in the store menu. Drag the order with the arrows. A category can sit inside
          another one, for example Floral inside Scented candles.
        </p>
        <p>
          To take a category out of the store without losing it, press <strong>Hide</strong>.
        </p>
      </HowItWorks>

      <div className={`${card} mt-8 overflow-hidden`}>
        {categories.length === 0 ? (
          <Empty title="No categories yet" text="Add one to start grouping your candles." />
        ) : (
          <ul className="divide-y divide-hairline">
            {categories.map((c, i) => (
              <li key={c.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
                <div className="flex shrink-0">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${c.name} up`}
                    className="grid h-11 w-9 place-items-center rounded-lg hover:bg-wax disabled:opacity-30"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={i === categories.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${c.name} down`}
                    className="grid h-11 w-9 place-items-center rounded-lg hover:bg-wax disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium">
                    {c.parent && <span className="font-normal text-umber">{parentName(c.parent)} / </span>}
                    {c.name}
                    {c.archived && (
                      <span className="ml-2 rounded-full bg-wax px-2 py-0.5 text-xs text-umber">Hidden</span>
                    )}
                  </p>
                  <p className="text-sm text-umber">{c.description}</p>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-umber">
                  {count(c.slug)} {count(c.slug) === 1 ? 'product' : 'products'}
                </p>
                <div className="flex shrink-0 gap-4 text-sm">
                  <button type="button" onClick={() => setEditing(c.slug)} className="link min-h-11">
                    Edit
                  </button>
                  <button type="button" onClick={() => toggleArchive(c)} className="link min-h-11">
                    {c.archived ? 'Show' : 'Hide'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(c)}
                    className="min-h-11 text-wine underline decoration-1 underline-offset-4"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        label={editing === 'new' ? 'Add category' : 'Edit category'}
        className="max-w-2xl rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        {editing !== null && (
          <CategoryForm
            key={editing}
            title={editing === 'new' ? 'Add category' : 'Edit category'}
            initial={current}
            taken={categories.filter(c => c.slug !== editing).map(c => c.slug)}
            parents={categories.filter(c => c.slug !== editing && !c.parent)}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        label="Delete category"
        className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        <h2 className="pr-10 text-3xl">Delete {removing?.name}?</h2>
        {removing && count(removing.slug) > 0 ? (
          <>
            <p className="mt-2 text-umber">
              {count(removing.slug)} products are in this category. Move them to another category first, then delete it.
              Or hide the category: it leaves the store menu and its products stay where they are.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {!removing.archived && (
                <button type="button" onClick={() => toggleArchive(removing)} className="btn-primary flex-1">
                  Hide it instead
                </button>
              )}
              <button type="button" onClick={() => setRemoving(null)} className="btn-outline">
                Close
              </button>
            </div>
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
  parents,
  onSave,
  onCancel,
}: {
  title: string
  initial?: Category
  taken: string[]
  parents: Category[]
  onSave: (category: Category) => void
  onCancel: () => void
}) {
  const { live } = useAdmin()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [parent, setParent] = useState(initial?.parent ?? '')
  const [image, setImage] = useState(initial?.image ?? '')
  const [banner, setBanner] = useState(initial?.banner ?? '')
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? '')
  const [uploading, setUploading] = useState<'image' | 'banner' | null>(null)
  const [error, setError] = useState('')

  const upload = async (which: 'image' | 'banner', files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploading(which)
    const form = new FormData()
    form.set('file', file)
    const result = await adminUploadImage(form)
    setUploading(null)
    if (!result.ok) return setError(result.error)
    if (which === 'image') setImage(result.data)
    else setBanner(result.data)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (clean.length < 2) return setError('Enter a category name.')
    if (!initial && taken.includes(slugify(clean))) return setError('A category with this name already exists.')
    for (const link of [image, banner]) {
      if (link && !/^https?:\/\//.test(link) && !/^[0-9]+-[0-9a-f]+$/.test(link))
        return setError('Paste a full picture link that starts with https://, or upload one.')
    }
    onSave({
      slug: initial?.slug ?? slugify(clean),
      name: clean,
      description: description.trim(),
      cover: initial?.cover ?? '',
      parent: parent || undefined,
      image: image.trim() || undefined,
      banner: banner.trim() || undefined,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      archived: initial?.archived ?? false,
    })
  }

  const picture = (
    which: 'image' | 'banner',
    label: string,
    hint: string,
    value: string,
    setValue: (v: string) => void,
  ) => (
    <div>
      <p className="field-label">{label}</p>
      <p className="-mt-1 mb-2 text-sm text-umber">{hint}</p>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl(value, 480)}
          alt=""
          className={`mb-2 w-full rounded-xl object-cover ${which === 'banner' ? 'aspect-[3/1]' : 'aspect-square max-w-[10rem]'}`}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="https://…"
          aria-label={`${label} link`}
          className="field min-w-0 flex-1"
        />
        {live && (
          <label className="btn-outline shrink-0 cursor-pointer px-4 text-sm">
            <Upload size={15} /> {uploading === which ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={e => upload(which, e.target.files)}
            />
          </label>
        )}
        {value && (
          <button type="button" onClick={() => setValue('')} className="link min-h-11 text-sm">
            Remove
          </button>
        )}
      </div>
    </div>
  )

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{title}</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cat-name" className="field-label">
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
        </div>
        <div>
          <label htmlFor="cat-parent" className="field-label">
            Sits inside <span className="font-normal text-umber">(optional)</span>
          </label>
          <select id="cat-parent" value={parent} onChange={e => setParent(e.target.value)} className="field">
            <option value="">Nothing, it is a main category</option>
            {parents.map(c => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cat-desc" className="field-label">
            Description, shown at the top of the category page
          </label>
          <textarea
            id="cat-desc"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="field py-3"
          />
        </div>
        {picture('image', 'Picture', 'Shown on category cards. A square photo works best.', image, setImage)}
        {picture('banner', 'Banner', 'A wide photo across the top of the category page.', banner, setBanner)}
      </div>
      <details className="mt-5 rounded-xl border border-hairline p-4">
        <summary className="cursor-pointer font-medium">Google search text (optional)</summary>
        <p className="mt-2 text-sm text-umber">
          What Google shows for this category. Leave empty to use the name and description.
        </p>
        <label htmlFor="cat-seo-title" className="field-label mt-3">
          Title
        </label>
        <input
          id="cat-seo-title"
          value={seoTitle}
          onChange={e => setSeoTitle(e.target.value)}
          maxLength={70}
          className="field"
        />
        <label htmlFor="cat-seo-desc" className="field-label mt-3">
          Description
        </label>
        <textarea
          id="cat-seo-desc"
          rows={2}
          value={seoDescription}
          onChange={e => setSeoDescription(e.target.value)}
          maxLength={170}
          className="field py-3"
        />
      </details>
      {error && <p className="field-error mt-4">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" disabled={uploading !== null} className="btn-primary flex-1">
          Save category
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Discard
        </button>
      </div>
    </form>
  )
}
