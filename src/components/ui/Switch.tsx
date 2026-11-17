import clsx from 'clsx'

/** An on/off switch. Use it for settings that take effect at once. */
export default function Switch({
  checked,
  onChange,
  label,
  labelledBy,
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  /** Read by screen readers, for example "Show Desi Gulab in the store" */
  label?: string
  /** Id of a visible text that names the switch, instead of label */
  labelledBy?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-sage' : 'bg-hairline',
        className,
      )}
    >
      <span
        className={clsx(
          'absolute left-1 top-1 h-5 w-5 rounded-full bg-linen transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
