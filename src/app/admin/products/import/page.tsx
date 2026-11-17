'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ArrowLeft, Download, Upload } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin, type AdminProduct } from '@/components/admin/AdminData'
import { card, done, downloadCsv, td, th } from '@/components/admin/ui'

const columns = ['name', 'size', 'sku', 'price', 'stock', 'category', 'description', 'fragrance'] as const
type Column = (typeof columns)[number]

const sample = [
  columns as unknown as string[],
  [
    'Saffron Milk',
    '220 g',
    'CLS-SAFFRON-220',
    '1900',
    '20',
    'Scented candles',
    'Warm saffron threads steeped in sweet milk.',
    'Saffron and milk',
  ],
  ['Saffron Milk', '400 g', 'CLS-SAFFRON-400', '2950', '8', 'Scented candles', '', ''],
  ['Desi Gulab', '220 g', 'CLS-ROSE-220', '1950', '30', '', '', ''],
]

/** Splits CSV text into rows. Handles quoted cells, doubled quotes and line breaks inside quotes. */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

type Checked = {
  line: number
  values: Record<Column, string>
  action: 'New product' | 'New size' | 'Update price and stock' | 'Error'
  problem?: string
}

export default function ImportProductsPage() {
  const router = useRouter()
  const { products, categories, saveProduct } = useAdmin()
  const [text, setText] = useState('')

  const checked = useMemo(() => {
    const rows = parseCsv(text)
    if (rows.length === 0) return { rows: [] as Checked[], headerProblem: '' }
    const header = rows[0].map(h => h.trim().toLowerCase())
    const missing = ['name', 'size', 'sku', 'price', 'stock'].filter(c => !header.includes(c))
    if (missing.length > 0)
      return {
        rows: [] as Checked[],
        headerProblem: `The first row must name the columns. Missing: ${missing.join(', ')}.`,
      }

    const bySku = new Map(products.flatMap(p => p.variants.map(v => [v.sku, p] as const)))
    const seen = new Set<string>()
    const newNames = new Set<string>()
    const result = rows.slice(1).map((cells, i): Checked => {
      const values = Object.fromEntries(columns.map(c => [c, (cells[header.indexOf(c)] ?? '').trim()])) as Record<
        Column,
        string
      >
      values.sku = values.sku.toUpperCase()
      const row = { line: i + 2, values }
      const fail = (problem: string): Checked => ({ ...row, action: 'Error', problem })
      const price = Number(values.price)
      const stock = Number(values.stock)

      if (!values.sku) return fail('SKU is empty.')
      if (seen.has(values.sku)) return fail(`SKU ${values.sku} appears more than once in this file.`)
      seen.add(values.sku)
      if (!Number.isInteger(price) || price < 1) return fail('Price must be a whole number of rupees.')
      if (!Number.isInteger(stock) || stock < 0) return fail('Stock must be a whole number, 0 or more.')

      const owner = bySku.get(values.sku)
      if (owner) {
        if (values.name && slugify(values.name) !== owner.slug)
          return fail(`SKU ${values.sku} already belongs to ${owner.name}.`)
        return { ...row, action: 'Update price and stock' }
      }
      if (!values.name) return fail('Name is empty.')
      if (!values.size) return fail('Size is empty.')
      const existing = products.find(p => p.slug === slugify(values.name))
      if (existing || newNames.has(slugify(values.name))) return { ...row, action: 'New size' }
      if (!values.category) return fail('A new product needs a category.')
      if (!categories.some(c => c.slug === slugify(values.category)))
        return fail(`Category "${values.category}" does not exist. Add it first, or fix the spelling.`)
      newNames.add(slugify(values.name))
      return { ...row, action: 'New product' }
    })
    return { rows: result, headerProblem: '' }
  }, [text, products, categories])

  const valid = checked.rows.filter(r => r.action !== 'Error')
  const failed = checked.rows.length - valid.length

  const [fileError, setFileError] = useState('')

  const readFile = async (file?: File) => {
    if (!file) return
    setFileError('')
    if (/\.xlsx$/i.test(file.name)) {
      // Excel: read the first sheet and turn it into the same rows as a CSV
      try {
        const { default: readXlsx } = await import('read-excel-file')
        const sheet = await readXlsx(file)
        const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
        setText(sheet.map(row => row.map(cell).join(',')).join('\n'))
      } catch {
        setFileError('That Excel file could not be read. Save it again as .xlsx, or as CSV, and try once more.')
      }
      return
    }
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  const run = () => {
    // Work on copies so several rows for one product build on each other
    const drafts = new Map<string, AdminProduct>()
    const draftFor = (slug: string) => drafts.get(slug) ?? products.find(p => p.slug === slug)
    valid.forEach(({ values, action }) => {
      const price = Number(values.price)
      const stock = Number(values.stock)
      if (action === 'Update price and stock') {
        const owner = products.find(p => p.variants.some(v => v.sku === values.sku))!
        const base = draftFor(owner.slug)!
        drafts.set(owner.slug, {
          ...base,
          variants: base.variants.map(v => (v.sku === values.sku ? { ...v, price, stock } : v)),
        })
        return
      }
      const slug = slugify(values.name)
      const variant = { id: `v-${values.sku.toLowerCase()}`, label: values.size, sku: values.sku, price, stock }
      const base = draftFor(slug)
      if (base) return void drafts.set(slug, { ...base, variants: [...base.variants, variant] })
      drafts.set(slug, {
        id: `p${Date.now()}${drafts.size}`,
        slug,
        name: values.name,
        tagline: '',
        description: values.description,
        categories: [slugify(values.category)],
        tags: [],
        fragrance: values.fragrance || undefined,
        fragranceFamily: 'Floral',
        art: { shape: 'jar', wax: '#EADFCB', vessel: '#F3E7D8', bg: '#EADFCB' },
        images: [],
        variants: [variant],
        rating: 0,
        reviewCount: 0,
        sold: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        isNew: true,
        // Imported products stay hidden until photos and details are checked
        active: false,
      })
    })
    drafts.forEach(p => saveProduct(p))
    done(`Import finished: ${valid.length} rows applied${failed ? `, ${failed} skipped` : ''}`)
    router.push('/admin/products')
  }

  const errorReport = () =>
    downloadCsv('import-errors.csv', [
      ['row', 'problem', ...columns],
      ...checked.rows
        .filter(r => r.action === 'Error')
        .map(r => [r.line, r.problem ?? '', ...columns.map(c => r.values[c])]),
    ])

  return (
    <>
      <Link
        href="/admin/products"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-umber hover:text-caramel"
      >
        <ArrowLeft size={16} /> All products
      </Link>
      <h1 className="mt-2 text-4xl lg:text-5xl">Import products</h1>
      <p className="mt-2 max-w-2xl text-umber">
        Add many candles at once, or update prices and stock in bulk. One row per size. A SKU that already exists gets
        its price and stock updated. Nothing changes until you press Import.
      </p>

      <section className={`${card} mt-8 p-5 sm:p-6`} aria-labelledby="file-h">
        <h2 id="file-h" className="text-2xl">
          Your file
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="btn-primary cursor-pointer">
            <Upload size={17} /> Choose an Excel or CSV file
            <input
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={e => readFile(e.target.files?.[0])}
            />
          </label>
          <button type="button" onClick={() => downloadCsv('products-template.csv', sample)} className="btn-outline">
            <Download size={17} /> Download template
          </button>
        </div>
        <p className="mt-3 text-sm text-umber">
          Open the template in Excel or Google Sheets, fill one row per size, then save and choose the file here.
        </p>
        {fileError && <p className="field-error">{fileError}</p>}
        <label htmlFor="csv" className="field-label mt-5">
          Or paste the rows here
        </label>
        <textarea
          id="csv"
          rows={6}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={columns.join(',')}
          className="field py-3 font-mono text-sm"
        />
        {checked.headerProblem && (
          <p role="alert" className="field-error">
            {checked.headerProblem}
          </p>
        )}
      </section>

      {checked.rows.length > 0 && (
        <section className="mt-6" aria-labelledby="preview-h">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="preview-h" className="text-2xl">
                Preview
              </h2>
              <p className="mt-1 text-umber">
                {valid.length} {valid.length === 1 ? 'row is' : 'rows are'} ready
                {failed > 0 &&
                  `, ${failed} ${failed === 1 ? 'has a problem and will be skipped' : 'have problems and will be skipped'}`}
                . New products arrive hidden so you can add photos first.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {failed > 0 && (
                <button type="button" onClick={errorReport} className="btn-outline">
                  Download error report
                </button>
              )}
              <button type="button" onClick={run} disabled={valid.length === 0} className="btn-primary">
                Import {valid.length} {valid.length === 1 ? 'row' : 'rows'}
              </button>
            </div>
          </div>
          <div className={`${card} relative mt-4 overflow-x-auto`}>
            <table className="w-full min-w-[48rem] text-[0.95rem]">
              <thead className="border-b border-hairline bg-wax/50">
                <tr>
                  <th className={th}>Row</th>
                  <th className={th}>Product</th>
                  <th className={th}>SKU</th>
                  <th className={`${th} text-right`}>Price</th>
                  <th className={`${th} text-right`}>Stock</th>
                  <th className={th}>What will happen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {checked.rows.map(r => (
                  <tr key={r.line} className={clsx(r.action === 'Error' && 'bg-wine/5')}>
                    <td className={`${td} tabular-nums text-umber`}>{r.line}</td>
                    <td className={td}>
                      {r.values.name || 'No name'}
                      <span className="block text-sm text-umber">{r.values.size}</span>
                    </td>
                    <td className={td}>{r.values.sku}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.values.price}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.values.stock}</td>
                    <td className={td}>
                      {r.action === 'Error' ? (
                        <span className="text-wine">Skipped. {r.problem}</span>
                      ) : (
                        <span className="text-sage">{r.action}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
