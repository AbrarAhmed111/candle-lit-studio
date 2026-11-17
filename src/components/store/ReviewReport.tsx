'use client'

import { useState } from 'react'
import { reportReview } from '@/lib/actions/store'

/** Lets any visitor flag a review. Three reports send it back for checking. */
export default function ReviewReport({ id }: { id: string }) {
  const [state, setState] = useState<'idle' | 'asking' | 'sent'>('idle')
  const [reason, setReason] = useState('Spam or advertising')

  if (state === 'sent') return <span className="text-sm text-umber">Thank you, we will check it.</span>
  if (state === 'asking') {
    return (
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <select
          value={reason}
          onChange={e => setReason(e.target.value)}
          aria-label="Why report this review"
          className="min-h-9 rounded-lg border border-hairline bg-linen px-2"
        >
          <option>Spam or advertising</option>
          <option>Rude or hateful</option>
          <option>Not about this candle</option>
          <option>Shares private details</option>
        </select>
        <button
          type="button"
          onClick={async () => {
            await reportReview(id, reason)
            setState('sent')
          }}
          className="link min-h-9"
        >
          Send
        </button>
        <button type="button" onClick={() => setState('idle')} className="min-h-9 text-umber">
          Cancel
        </button>
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => setState('asking')}
      className="min-h-9 text-sm text-umber underline-offset-4 hover:underline"
    >
      Report
    </button>
  )
}
