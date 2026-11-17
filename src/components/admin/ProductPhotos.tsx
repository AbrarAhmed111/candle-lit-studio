'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react'
import { useAdmin } from './AdminData'
import { card } from './ui'
import { photoUrl } from '@/components/store/ProductPhoto'
import { adminUploadImage } from '@/lib/actions/admin'

/** The product photos: upload, paste a link, reorder or remove. The first one is the main photo. */
export default function ProductPhotos({
  images,
  onChange,
  error,
  onError,
}: {
  images: string[]
  onChange: (images: string[]) => void
  error?: string
  onError: (message: string) => void
}) {
  const { live } = useAdmin()
  const [link, setLink] = useState('')
  const [uploading, setUploading] = useState(false)
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    const added: string[] = []
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.set('file', file)
      const result = await adminUploadImage(form)
      if (!result.ok) {
        onError(`${file.name}: ${result.error}`)
        break
      }
      added.push(result.data)
    }
    onChange([...images, ...added])
    setUploading(false)
  }

  const addPhoto = () => {
    const url = link.trim()
    if (!/^https:\/\/\S+\.\S+/.test(url)) return onError('Paste a full image link that starts with https://')
    if (images.includes(url)) return onError('That photo is already added.')
    onChange([...images, url])
    setLink('')
    onError('')
  }

  const movePhoto = (index: number, by: number) => {
    const next = [...images]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    onChange(next)
  }

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="photos-h">
      <h2 id="photos-h" className="text-2xl">
        Photos
      </h2>
      <p className="mt-1 text-sm text-umber">
        The first photo is the main one. {live ? 'Upload a photo, or paste an image link.' : 'Paste an image link.'}
      </p>
      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((id, i) => (
            <li key={id} className="overflow-hidden rounded-xl border border-hairline bg-wax">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(id, 240)} alt={`Photo ${i + 1}`} className="aspect-[4/5] w-full object-cover" />
              <div className="flex items-center justify-between bg-linen">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => movePhoto(i, -1)}
                  aria-label={`Move photo ${i + 1} earlier`}
                  className="grid h-11 w-9 place-items-center disabled:opacity-30"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  disabled={i === images.length - 1}
                  onClick={() => movePhoto(i, 1)}
                  aria-label={`Move photo ${i + 1} later`}
                  className="grid h-11 w-9 place-items-center disabled:opacity-30"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(images.filter(x => x !== id))}
                  aria-label={`Remove photo ${i + 1}`}
                  className="grid h-11 w-9 place-items-center text-wine"
                >
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
            onError('')
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
      {error && <p className="field-error">{error}</p>}
    </section>
  )
}
