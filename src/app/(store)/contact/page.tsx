import type { Metadata } from 'next'
import { FaWhatsapp } from 'react-icons/fa'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import ContactForm from '@/components/store/ContactForm'
import { store } from '@/data/store'

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Message Candle Lit Studio on WhatsApp, by phone or by email.',
}

export default function ContactPage() {
  return (
    <div className="page pt-8 lg:pt-12">
      <Breadcrumbs items={[{ label: 'Contact us' }]} />
      <h1 className="mt-6 text-5xl lg:text-6xl">Contact us</h1>
      <p className="mt-4 max-w-xl text-lg text-umber">
        Questions about an order, a fragrance or a bulk gift? WhatsApp is fastest.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <a
            href={`https://wa.me/${store.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="btn bg-[#1F8A4C] text-white hover:bg-[#19733F]"
          >
            <FaWhatsapp size={20} /> Chat on WhatsApp
          </a>
          <dl className="mt-10 space-y-6">
            <div className="border-t border-hairline pt-5">
              <dt className="text-sm text-umber">Phone</dt>
              <dd className="mt-1 text-lg">
                <a href={`tel:${store.phone.replace(/\s/g, '')}`} className="link">
                  {store.phone}
                </a>
              </dd>
            </div>
            <div className="border-t border-hairline pt-5">
              <dt className="text-sm text-umber">Email</dt>
              <dd className="mt-1 text-lg">
                <a href={`mailto:${store.email}`} className="link break-all">
                  {store.email}
                </a>
              </dd>
            </div>
            <div className="border-t border-hairline pt-5">
              <dt className="text-sm text-umber">Studio</dt>
              <dd className="mt-1 text-lg">{store.address}</dd>
              <dd className="text-umber">Monday to Saturday, 10 am to 7 pm. Visits by appointment.</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="mb-6 text-3xl">Send a message</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  )
}
