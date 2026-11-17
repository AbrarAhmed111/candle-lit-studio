import Link from 'next/link'
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { topCategories } from '@/data/products'
import { builtBy, store } from '@/data/store'
import NewsletterForm from './NewsletterForm'
import Logo from '@/components/Logo'

export default function Footer() {
  return (
    <footer className="mt-24 bg-soot text-wax">
      <div className="page grid grid-cols-1 gap-12 py-16 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label={`${store.name}, home`} className="inline-block">
            <Logo size={64} name={store.name} nameClassName="text-3xl text-ivory" />
          </Link>
          <p className="mt-4 max-w-xs text-[0.95rem] text-wax/75">
            Hand-poured in Quetta. Slow to make, slow to burn, hard to forget.
          </p>
          <div className="mt-6 max-w-sm">
            <p className="mb-2 text-sm text-ivory">New scents and offers, before anyone else</p>
            <NewsletterForm tone="dark" />
          </div>
        </div>

        <FooterList title="Shop">
          <Link href="/shop">All candles</Link>
          {topCategories().map(c => (
            <Link key={c.slug} href={`/collections/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </FooterList>

        <FooterList title="Help">
          <Link href="/track-order">Track order</Link>
          <Link href="/faq">Questions and answers</Link>
          <Link href="/candle-care">Candle care</Link>
          <Link href="/policies/shipping">Shipping</Link>
          <Link href="/policies/returns">Returns and refunds</Link>
          <Link href="/contact">Contact us</Link>
        </FooterList>

        <FooterList title="Studio">
          <Link href="/about">Our story</Link>
          <a href={`tel:${store.phone.replace(/\s/g, '')}`}>{store.phone}</a>
          <a href={`mailto:${store.email}`} className="break-all">
            {store.email}
          </a>
          <span>{store.address}</span>
          <span className="flex gap-2 pt-2">
            <Social href={store.instagram} label="Instagram">
              <FaInstagram size={17} />
            </Social>
            <Social href={store.facebook} label="Facebook">
              <FaFacebookF size={15} />
            </Social>
            <Social href={`https://wa.me/${store.whatsapp}`} label="WhatsApp">
              <FaWhatsapp size={18} />
            </Social>
          </span>
        </FooterList>
      </div>

      <div className="border-t border-wax/15">
        <div className="page flex flex-col gap-3 py-6 pr-16 text-sm text-wax/60 sm:flex-row sm:items-center sm:justify-between sm:pr-24">
          <p>© 2026 Candle Lit Studio</p>
          <a
            href={builtBy.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Built by DevAbby, opens portfolio in a new tab"
            className="group flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-wax/70 hover:text-ivory"
          >
            BUILT BY
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={builtBy.logo}
              alt="DevAbby"
              width={1117}
              height={223}
              loading="lazy"
              className="h-8 w-auto rounded-lg transition-transform duration-300 group-hover:scale-105"
            />
          </a>
          <p className="flex gap-5">
            <Link href="/policies/privacy" className="hover:text-ivory">
              Privacy
            </Link>
            <Link href="/policies/terms" className="hover:text-ivory">
              Terms
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-sans text-sm font-semibold tracking-normal text-ivory">{title}</h2>
      <div className="flex flex-col items-start gap-2.5 text-[0.95rem] text-wax/75 [&_a:hover]:text-ivory">
        {children}
      </div>
    </div>
  )
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-wax/30 transition-colors hover:border-ember hover:text-ember"
    >
      {children}
    </a>
  )
}
