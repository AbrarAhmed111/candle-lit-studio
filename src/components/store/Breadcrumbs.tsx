import Link from 'next/link'

type Crumb = { label: string; href?: string }

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-umber">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/" className="hover:text-caramel">
            Home
          </Link>
        </li>
        {items.map(item => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden>/</span>
            {item.href ? (
              <Link href={item.href} className="hover:text-caramel">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-espresso">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
