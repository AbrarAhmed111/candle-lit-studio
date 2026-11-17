/** Small read-only pieces shared by the order screens */

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-umber">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-umber">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}
