'use client'

import { useId, useState } from 'react'
import { Check, Copy, ImageUp, LoaderCircle, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { store } from '@/data/store'
import { formatPKR } from '@/lib/pricing'
import { PROOF_MAX_BYTES, PROOF_TYPES } from '@/lib/payments'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export type PaymentErrors = { reference?: string; proof?: string }

/** Puts the screenshot in private storage and returns its path */
async function uploadProof(file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `checkout/${crypto.randomUUID()}.${ext}`
  if (!isSupabaseConfigured) return path
  // The Supabase client loads only when a screenshot is uploaded, keeping checkout light
  const { createClient } = await import('@/lib/supabase/client')
  const { error } = await createClient().storage.from('payment-proofs').upload(path, file, { contentType: file.type })
  if (error) throw error
  return path
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed. Select the text and copy it.')
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <dt className="text-sm text-umber">{label}</dt>
        <dd className="text-lg font-medium tabular-nums">{value}</dd>
      </div>
      <button type="button" onClick={copy} className="btn-outline min-h-11 shrink-0 px-4 text-sm">
        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

/**
 * The manual Easypaisa transfer: who to pay, how much, then the
 * transaction ID and a screenshot. Used at checkout and when a customer
 * sends new details after a rejected payment.
 */
export default function EasypaisaPayment({
  amount,
  reference,
  onReference,
  proof,
  onProof,
  errors = {},
}: {
  /** Exact amount to send, or null until the city is chosen */
  amount: number | null
  reference: string
  onReference: (value: string) => void
  proof: string | null
  onProof: (path: string | null) => void
  errors?: PaymentErrors
}) {
  const id = useId()
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [uploadError, setUploadError] = useState('')
  const ready = Boolean(store.easypaisaNumber)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setUploadError('')
    if (!PROOF_TYPES.includes(file.type) || file.size > PROOF_MAX_BYTES) {
      setUploadError('Use a JPG, PNG or WebP picture under 5 MB.')
      return
    }
    setUploading(true)
    onProof(null)
    try {
      onProof(await uploadProof(file))
      setFileName(file.name)
    } catch {
      setUploadError('The screenshot could not be uploaded. Check your internet and try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!ready) {
    return (
      <p role="alert" className="rounded-xl border border-wine/30 bg-wine/5 p-4 text-wine">
        Online payment is being set up. Please call or WhatsApp us on {store.phone} to place your order.
      </p>
    )
  }

  const proofError = uploadError || errors.proof
  return (
    <div className="rounded-xl border border-espresso bg-linen p-5">
      <div className="flex items-start gap-4">
        <Smartphone size={24} className="mt-0.5 shrink-0 text-caramel" />
        <div>
          <p className="font-medium">Pay with Easypaisa</p>
          <p className="mt-1 text-[0.95rem] text-umber">
            We take Easypaisa for every order, in every city. Send the amount below from your Easypaisa app, or from any
            bank app to our Easypaisa number. Then add the transaction ID and a screenshot here. We check every payment
            by hand and confirm your order once it reaches us.
          </p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-hairline border-y border-hairline">
        <CopyLine label="Account name" value={store.easypaisaName || store.name} />
        <CopyLine label="Easypaisa number" value={store.easypaisaNumber} />
        <div className="py-2.5">
          <dt className="text-sm text-umber">Amount to send, delivery included</dt>
          <dd className="font-display text-3xl">{amount === null ? 'Choose your city first' : formatPKR(amount)}</dd>
        </div>
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-ref`} className="field-label">
            Transaction ID (TID)
          </label>
          <input
            id={`${id}-ref`}
            name="reference"
            value={reference}
            onChange={e => onReference(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="For example 41234567890"
            aria-invalid={!!errors.reference}
            aria-describedby={`${id}-ref-help`}
            className="field"
          />
          <p id={`${id}-ref-help`} className={errors.reference ? 'field-error' : 'mt-1.5 text-sm text-umber'}>
            {errors.reference ?? 'It is on the payment receipt in your Easypaisa or bank app.'}
          </p>
        </div>
        <div>
          <span className="field-label" id={`${id}-shot-label`}>
            Payment screenshot
          </span>
          <label
            htmlFor={`${id}-shot`}
            className="field flex cursor-pointer items-center gap-2 overflow-hidden text-umber hover:border-espresso"
          >
            {uploading ? <LoaderCircle size={17} className="animate-spin" /> : <ImageUp size={17} />}
            <span className="truncate">
              {uploading ? 'Uploading…' : proof ? fileName || 'Screenshot added' : 'Choose a picture'}
            </span>
          </label>
          <input
            id={`${id}-shot`}
            name="proof"
            type="file"
            accept={PROOF_TYPES.join(',')}
            onChange={e => pick(e.target.files?.[0])}
            aria-labelledby={`${id}-shot-label`}
            aria-invalid={!!proofError}
            className="sr-only"
          />
          <p className={proofError ? 'field-error' : 'mt-1.5 text-sm text-umber'}>
            {proofError ?? (proof ? 'Added. Choose again to replace it.' : 'A clear picture of the receipt.')}
          </p>
        </div>
      </div>
    </div>
  )
}
