import Image from 'next/image'
import clsx from 'clsx'
import badge from '@/assets/img/logo-640.png'

type Props = {
  /** Badge width and height in pixels */
  size?: number
  /** Show the store name beside the badge */
  withName?: boolean
  name?: string
  /** Load straight away, for the header */
  priority?: boolean
  className?: string
  nameClassName?: string
}

/** The round Candle Lit badge, optionally with the store name beside it */
export default function Logo({
  size = 44,
  withName = true,
  name = 'Candle Lit Studio',
  priority,
  className,
  nameClassName,
}: Props) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <Image
        src={badge}
        alt={withName ? '' : name}
        width={size}
        height={size}
        priority={priority}
        sizes={`${size}px`}
        className="shrink-0 rounded-full drop-shadow-[0_2px_6px_rgba(46,31,23,0.25)]"
        style={{ width: size, height: size }}
      />
      {withName && <span className={clsx('font-display italic leading-none', nameClassName)}>{name}</span>}
    </span>
  )
}
