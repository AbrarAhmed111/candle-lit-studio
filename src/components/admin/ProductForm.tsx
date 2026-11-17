'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAdmin, type AdminProduct } from './AdminData'
import { card, done, SaveBar, useLeaveWarning } from './ui'
import { adminUploadImage } from '@/lib/actions/admin'
import Modal from '@/components/store/Modal'
import { photoUrl } from '@/components/store/ProductPhoto'
import type { FragranceFamily } from '@/types'

const families: FragranceFamily[] = ['Floral', 'Woody', 'Gourmand', 'Fresh', 'Earthy', 'Unscented']

type Row = { id: string; label: string; sku: string; price: string; stock: string }

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const newRow = (): Row => ({ id: `v${Date.now()}${Math.round(Math.random() * 1000)}`, label: '', sku: '', price: '', stock: '0' })

/** Create a product, or edit the one passed in. */
export default function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter()
  const { products, categories, orders, saveProduct, deleteProduct, live } = useAdmin()
  const isNew = !product

  const [name, setName] = useState(product?.name ?? '')
  const [tagline, setTagline] = useState(product?.tagline ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [fragrance, setFragrance] = useState(product?.fragrance ?? '')
  const [family, setFamily] = useState<FragranceFamily>(product?.fragranceFamily ?? 'Floral')
  const [waxType, setWaxType] = useState(product?.waxType ?? 'Soy wax')
  const [colour, setColour] = useState(product?.colour ?? '')
  const [tags, setTags] = useState(product?.tags.join(', ') ?? '')
  const [chosen, setChosen] = useState<string[]>(product?.categories ?? [])
  const [discount, setDiscount] = useState(product?.discountPercent ? String(product.discountPercent) : '')
  const [flags, setFlags] = useState({
    active: product?.active ?? true,
    featured: product?.featured ?? false,
    bestSeller: product?.bestSeller ?? false,
    isNew: product?.isNew ?? isNew,
  })
  const [rows, setRows] = useState<Row[]>(
    product?.variants.map(v => ({ id: v.id, label: v.label, sku: v.sku, price: String(v.price), stock: String(v.stock) })) ?? [newRow()],
  )
  const [images, setImages] = useState<string[]>(product?.images ?? [])
  const [link, setLink] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Compare everything the owner can edit with how the form opened
  const snapshot = JSON.stringify([name, tagline, description, fragrance, family, waxType, colour, tags, chosen, discount, flags, rows.map(({ id, ...r }) => r), images])
  const [initial] = useState(snapshot)
  const [saved, setSaved] = useState(false)
  const dirty = !saved && snapshot !== initial
  useLeaveWarning(dirty)

  const leave = (e: React.MouseEvent) => {
    if (dirty && !window.confirm('Leave without saving? Your changes will be lost.')) e.preventDefault()
  }

  const inOrders = product ? (orders ?? []).filter(o => o.lines.some(l => l.productId === product.id)).length : 0

  const setRow = (id: string, key: keyof Row, value: string) => {
    setRows(list => list.map(r => (r.id === id ? { ...r, [key]: value } : r)))
    setErrors(e => ({ ...e, variants: '' }))
  }

  const [uploading, setUploading] = useState(false)
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.set('file', file)
      const result = await adminUploadImage(form)
      if (!result.ok) {
        setErrors(e => ({ ...e, images: `${file.name}: ${result.error}` }))
        break
      }
      setImages(list => [...list, result.data])
    }
    setUploading(false)
  }

  const addPhoto = () => {
    const url = link.trim()
    if (!/^https:\/\/\S+\.\S+/.test(url)) return setErrors(e => ({ ...e, images: 'Paste a full image link that starts with https://' }))
    if (images.includes(url)) return setErrors(e => ({ ...e, images: 'That photo is already added.' }))
    setImages(list => [...list, url])
    setLink('')
    setErrors(e => ({ ...e, images: '' }))
  }

  const movePhoto = (index: number, by: number) =>
    setImages(list => {
      const next = [...list]
      ;[next[index], next[index + by]] = [next[index + by], next[index]]
      return next
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    const cleanName = name.trim()
    const slug = product?.slug ?? slugify(cleanName)
    if (cleanName.length < 2) found.name = 'Enter the product name.'
    else if (products.some(p => p.id !== product?.id && p.slug === slug))
      found.name = 'Another product already uses this name. Choose a different one.'
    if (description.trim().length < 20) found.description = 'Describe the candle in at least 20 characters.'
    if (chosen.length === 0) found.categories = 'Choose at least one category.'

    const pct = discount.trim() === '' ? 0 : Number(discount)
    if (!Number.isInteger(pct) || pct < 0 || pct > 90) found.discount = 'Enter a whole number from 0 to 90.'

    const parsed = rows.map(r => ({
      id: r.id,
      label: r.label.trim(),
      sku: r.sku.trim().toUpperCase(),
      price: Number(r.price),
      stock: Number(r.stock),
    }))
    const takenSkus = products.filter(p => p.id !== product?.id).flatMap(p => p.variants.map(v => v.sku))
    const skus = parsed.map(r => r.sku)
    const duplicate = skus.find((s, i) => skus.indexOf(s) !== i) ?? skus.find(s => takenSkus.includes(s))
    if (parsed.some(r => !r.label)) found.variants = 'Give every size a name, for example 220 g.'
    else if (parsed.some(r => !r.sku)) found.variants = 'Give every size a SKU.'
    else if (duplicate) found.variants = `SKU ${duplicate} is used more than once. Every SKU must be different.`
    else if (parsed.some(r => !Number.isInteger(r.price) || r.price < 1))
      found.variants = 'Enter each price as a whole number of rupees, for example 1850.'
    else if (parsed.some(r => !Number.isInteger(r.stock) || r.stock < 0))
      found.variants = 'Enter each stock count as a whole number, 0 or more.'

    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error('Fix the highlighted fields, then save again.')
      // Bring the first problem into view
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"], .field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    setSaved(true)

    saveProduct({
      // Kept as they are for an existing product
      rating: 0,
      reviewCount: 0,
      sold: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      art: { shape: 'jar', wax: '#EADFCB', vessel: '#F3E7D8', bg: '#EADFCB' },
      ...product,
      id: product?.id ?? `p${Date.now()}`,
      slug,
      name: cleanName,
      tagline: tagline.trim(),
      description: description.trim(),
      fragrance: fragrance.trim() || undefined,
      fragranceFamily: family,
      waxType: waxType.trim() || undefined,
      colour: colour.trim() || undefined,
      tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      categories: chosen,
      discountPercent: pct || undefined,
      images,
      variants: parsed.map(r => ({ ...product?.variants.find(v => v.id === r.id), ...r })),
      ...flags,
    })
    done(isNew ? `${cleanName} added` : `${cleanName} saved`)
    router.push('/admin/products')
  }

  const remove = () => {
    if (!product) return
    deleteProduct(product.id)
    done(`${product.name} deleted`)
    router.push('/admin/products')
  }

  const section = `${card} p-5 sm:p-6`
  const toggles: [keyof typeof flags, string, string][] = [
    ['active', 'Visible in the store', 'Turn off to hide it without deleting.'],
    ['featured', 'Featured', 'Shown in featured spots on the homepage.'],
    ['bestSeller', 'Best seller', 'Shown in the best sellers row.'],
    ['isNew', 'New arrival', 'Gets the New badge.'],
  ]

  return (
    <form onSubmit={submit} noValidate>
      <Link href="/admin/products" onClick={leave} className="inline-flex min-h-11 items-center gap-2 text-sm text-umber hover:text-caramel">
        <ArrowLeft size={16} /> All products
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl lg:text-5xl">{isNew ? 'Add product' : product.name}</h1>
        <div className="flex flex-wrap gap-2">
          {!isNew && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-outline">
              Delete
            </button>
          )}
          <button type="submit" className="btn-primary">
            {isNew ? 'Add product' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className={section} aria-labelledby="basics-h">
            <h2 id="basics-h" className="text-2xl">
              Basics
            </h2>
            <div className="mt-5 space-y-4">
              <Field id="p-name" label="Product name" error={errors.name}>
                <input
                  id="p-name"
                  value={name}
                  onChange={e => {
                    setName(e.target.value)
                    setErrors(er => ({ ...er, name: '' }))
                  }}
                  aria-invalid={!!errors.name}
                  className="field"
                />
              </Field>
              <Field id="p-tagline" label="Tagline, one short line under the name">
                <input id="p-tagline" value={tagline} onChange={e => setTagline(e.target.value)} className="field" />
              </Field>
              <Field id="p-desc" label="Description" error={errors.description}>
                <textarea
                  id="p-desc"
                  rows={4}
                  value={description}
                  onChange={e => {
                    setDescription(e.target.value)
                    setErrors(er => ({ ...er, description: '' }))
                  }}
                  aria-invalid={!!errors.description}
                  className="field py-3"
                />
              </Field>
            </div>
          </section>

          <section className={section} aria-labelledby="sizes-h">
            <div className="flex items-center justify-between gap-3">
              <h2 id="sizes-h" className="text-2xl">
                Sizes, prices and stock
              </h2>
              <button type="button" onClick={() => setRows(list => [...list, newRow()])} className="btn-outline min-h-11 px-4 text-sm">
                <Plus size={16} /> Add size
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {rows.map((r, i) => (
                <fieldset key={r.id} className="grid grid-cols-2 gap-3 rounded-xl bg-wax/40 p-3 sm:grid-cols-[1.2fr_1.4fr_1fr_0.8fr_auto] sm:items-end">
                  <legend className="sr-only">Size {i + 1}</legend>
                  {(
                    [
                      ['label', 'Size name', '220 g', 'text'],
                      ['sku', 'SKU', 'CLS-ROSE-220', 'text'],
                      ['price', 'Price (Rs.)', '1850', 'numeric'],
                      ['stock', 'In stock', '0', 'numeric'],
                    ] as const
                  ).map(([key, label, hint, mode]) => (
                    <label key={key} className="text-sm text-umber">
                      {label}
                      <input
                        value={r[key]}
                        inputMode={mode}
                        placeholder={hint}
                        onChange={e => setRow(r.id, key, e.target.value)}
                        className="field mt-1"
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRows(list => list.filter(x => x.id !== r.id))}
                    disabled={rows.length === 1}
                    aria-label={`Remove size ${r.label || i + 1}`}
                    className="grid h-12 w-12 place-items-center rounded-xl text-wine hover:bg-wine/10 disabled:opacity-30"
                  >
                    <Trash2 size={17} />
                  </button>
                </fieldset>
              ))}
            </div>
            {errors.variants && (
              <p role="alert" className="field-error">
                {errors.variants}
              </p>
            )}
            <div className="mt-5 max-w-xs">
              <Field id="p-discount" label="Discount on every size (%)" error={errors.discount}>
                <input
                  id="p-discount"
                  inputMode="numeric"
                  value={discount}
                  placeholder="0"
                  onChange={e => {
                    setDiscount(e.target.value)
                    setErrors(er => ({ ...er, discount: '' }))
                  }}
                  aria-invalid={!!errors.discount}
                  className="field"
                />
              </Field>
            </div>
          </section>

          <section className={section} aria-labelledby="photos-h">
            <h2 id="photos-h" className="text-2xl">
              Photos
            </h2>
            <p className="mt-1 text-sm text-umber">
              The first photo is the main one.{' '}
              {live ? 'Upload a photo, or paste an image link.' : 'Photo upload works once Supabase is connected. For now paste image links.'}
            </p>
            {images.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((id, i) => (
                  <li key={id} className="overflow-hidden rounded-xl border border-hairline bg-wax">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(id, 240)} alt={`Photo ${i + 1}`} className="aspect-[4/5] w-full object-cover" />
                    <div className="flex items-center justify-between bg-linen">
                      <button type="button" disabled={i === 0} onClick={() => movePhoto(i, -1)} aria-label={`Move photo ${i + 1} earlier`} className="grid h-11 w-9 place-items-center disabled:opacity-30">
                        <ArrowUp size={15} />
                      </button>
                      <button type="button" disabled={i === images.length - 1} onClick={() => movePhoto(i, 1)} aria-label={`Move photo ${i + 1} later`} className="grid h-11 w-9 place-items-center disabled:opacity-30">
                        <ArrowDown size={15} />
                      </button>
                      <button type="button" onClick={() => setImages(list => list.filter(x => x !== id))} aria-label={`Remove photo ${i + 1}`} className="grid h-11 w-9 place-items-center text-wine">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-2">
              <input
                value={link}
                onChange={e => {
                  setLink(e.target.value)
                  setErrors(er => ({ ...er, images: '' }))
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addPhoto()
                  }
                }}
                placeholder="https://…/candle.jpg"
                aria-label="Image link"
                className="field min-w-0 flex-1"
              />
              <button type="button" onClick={addPhoto} className="btn-outline shrink-0">
                Add link
              </button>
            </div>
            {live && (
              <label className="btn-primary mt-3 cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-caramel">
                <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload photos'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  disabled={uploading}
                  onChange={e => upload(e.target.files)}
                  className="sr-only"
                />
              </label>
            )}
            {errors.images && <p className="field-error">{errors.images}</p>}
          </section>
        </div>

        <div className="space-y-6">
          <section className={section} aria-labelledby="vis-h">
            <h2 id="vis-h" className="text-2xl">
              Visibility
            </h2>
            <ul className="mt-3 divide-y divide-hairline">
              {toggles.map(([key, title, text]) => (
                <li key={key} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p id={`flag-${key}`} className="font-medium">
                      {title}
                    </p>
                    <p className="text-sm text-umber">{text}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flags[key]}
                    aria-labelledby={`flag-${key}`}
                    onClick={() => setFlags(f => ({ ...f, [key]: !f[key] }))}
                    className={clsx('relative h-7 w-12 shrink-0 rounded-full transition-colors', flags[key] ? 'bg-sage' : 'bg-hairline')}
                  >
                    <span className={clsx('absolute left-1 top-1 h-5 w-5 rounded-full bg-linen transition-transform', flags[key] && 'translate-x-5')} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={section} aria-labelledby="cat-h">
            <h2 id="cat-h" className="text-2xl">
              Categories
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map(c => {
                const on = chosen.includes(c.slug)
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setChosen(list => (on ? list.filter(s => s !== c.slug) : [...list, c.slug]))
                      setErrors(er => ({ ...er, categories: '' }))
                    }}
                    className={clsx(
                      'min-h-11 rounded-full border px-4 text-sm transition-colors',
                      on ? 'border-espresso bg-espresso text-ivory' : 'border-hairline hover:border-espresso',
                    )}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
            {errors.categories && <p className="field-error">{errors.categories}</p>}
            <div className="mt-5">
              <Field id="p-tags" label="Tags, separated by commas">
                <input id="p-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="rose, saffron" className="field" />
              </Field>
            </div>
          </section>

          <section className={section} aria-labelledby="scent-h">
            <h2 id="scent-h" className="text-2xl">
              Scent and wax
            </h2>
            <div className="mt-4 space-y-4">
              <Field id="p-family" label="Fragrance family">
                <select id="p-family" value={family} onChange={e => setFamily(e.target.value as FragranceFamily)} className="field">
                  {families.map(f => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field id="p-fragrance" label="Fragrance, for example Rose and saffron">
                <input id="p-fragrance" value={fragrance} onChange={e => setFragrance(e.target.value)} className="field" />
              </Field>
              <Field id="p-wax" label="Wax">
                <input id="p-wax" value={waxType} onChange={e => setWaxType(e.target.value)} className="field" />
              </Field>
              <Field id="p-colour" label="Colour">
                <input id="p-colour" value={colour} onChange={e => setColour(e.target.value)} className="field" />
              </Field>
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        label="Delete product"
        className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        <h2 className="pr-10 text-3xl">Delete {product?.name}?</h2>
        {inOrders > 0 ? (
          <>
            <p className="mt-2 text-umber">
              This candle appears in {inOrders} {inOrders === 1 ? 'order' : 'orders'}, so it cannot be deleted.
              Hide it from the store instead and the order records stay intact.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setFlags(f => ({ ...f, active: false }))
                  setConfirmDelete(false)
                  toast('Set to hidden. Save changes to apply.')
                }}
                className="btn-primary flex-1"
              >
                Hide from store
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-outline">
                Keep as is
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-umber">It has no orders, so it can be removed. This cannot be undone.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={remove} className="btn flex-1 bg-wine text-ivory before:bg-espresso">
                Delete product
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-outline">
                Keep product
              </button>
            </div>
          </>
        )}
      </Modal>

      <SaveBar show={dirty} label={isNew ? 'Add product' : 'Save changes'} />
      {/* Room for the save bar so it never covers the last field */}
      {dirty && <div aria-hidden className="h-20" />}
    </form>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
