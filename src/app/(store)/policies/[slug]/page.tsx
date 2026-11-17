import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import clsx from 'clsx'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import { policies } from '@/data/store'

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = () => Object.keys(policies).map(slug => ({ slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = policies[(await params).slug]
  return policy ? { title: policy.title, description: policy.intro } : {}
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params
  const policy = policies[slug]
  if (!policy) notFound()

  return (
    <div className="page pt-8 lg:pt-12">
      <Breadcrumbs items={[{ label: policy.title }]} />
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[14rem_1fr] lg:gap-20">
        <nav aria-label="Policies" className="order-2 lg:order-1 lg:pt-3">
          <ul className="flex flex-col gap-2 border-t border-hairline pt-6 lg:border-0 lg:pt-0">
            {Object.entries(policies).map(([key, p]) => (
              <li key={key}>
                <Link
                  href={`/policies/${key}`}
                  aria-current={key === slug ? 'page' : undefined}
                  className={clsx(
                    'hover:text-caramel',
                    key === slug ? 'font-medium text-espresso' : 'text-umber',
                  )}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="prose-store order-1 max-w-prose lg:order-2">
          <h1 className="text-5xl lg:text-6xl">{policy.title}</h1>
          <p className="mt-4 text-lg">{policy.intro}</p>
          {policy.sections.map(s => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.body.length === 1 ? (
                <p>{s.body[0]}</p>
              ) : (
                <ul>
                  {s.body.map(line => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
