/**
 * A field people never see. Spam bots fill in every input, so a form that
 * arrives with this filled is quietly ignored.
 */
export default function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this empty
        <input tabIndex={-1} autoComplete="off" name="company_website" value={value} onChange={e => onChange(e.target.value)} />
      </label>
    </div>
  )
}
