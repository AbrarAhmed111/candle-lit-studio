import type { Coupon, Order } from '@/types'

// Dummy store settings. These become admin-managed settings later.

export const store = {
  name: 'Candle Lit Studio',
  announcement: 'Cash on delivery across Pakistan. Free delivery on orders over Rs. 5,000.',
  email: 'hello@candlelitstudio.pk',
  phone: '+92 300 1234567',
  whatsapp: '923001234567',
  address: 'Studio 4, Jinnah Road, Quetta',
  instagram: 'https://instagram.com/candlelitstudio',
  facebook: 'https://facebook.com/candlelitstudio',
  shippingFee: 250,
  freeShippingOver: 5000,
  deliveryEstimate: '2 to 4 working days',
}

// Homepage hero slides. Placeholder photos from Unsplash: replace with the
// brand's own photography. These become admin-managed banners later.
const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2000&q=75`

export const heroSlides = [
  {
    image: unsplash('photo-1668954443518-34de30690425'),
    alt: 'A lit amber jar candle glowing in a dark room',
    position: '60% center',
    kicker: 'Hand-poured in Quetta',
    title: ['Light up the', 'quiet hours.'],
    text: 'Slow-burning soy candles in scents that feel like home. Strike a match and let the evening begin.',
    primary: { label: 'Shop all candles', href: '/shop' },
    secondary: { label: 'Meet Winter Bonfire', href: '/products/winter-bonfire' },
  },
  {
    image: unsplash('photo-1544472991-1324437fe348'),
    alt: 'A lit pillar candle in front of soft golden lights',
    position: '70% center',
    kicker: 'Winter Glow Sale, ends 30 November',
    title: ['Long nights,', 'lower prices.'],
    text: 'Up to 20% off the candles made for winter. Chai, citrus and a little woodsmoke.',
    primary: { label: 'Shop the sale', href: '/shop?sale=1' },
    secondary: { label: 'See best sellers', href: '/shop?sort=best-selling' },
  },
  {
    image: unsplash('photo-1602523961358-f9f03dd557db'),
    alt: 'Three lit white candles on a dark surface',
    position: '50% center',
    kicker: 'Gift sets, boxed and ribboned',
    title: ['Give them', 'the glow.'],
    text: 'Three scents in one keepsake box, with your note written by hand. The gift that actually gets used.',
    primary: { label: 'Shop gift sets', href: '/collections/gift-sets' },
    secondary: { label: 'View The Evening Trio', href: '/products/the-evening-trio' },
  },
]

// Official tracking pages. The courier and tracking ID arrive in the dispatch email.
export const couriers = [
  { name: 'TCS', trackingUrl: 'https://www.tcsexpress.com/track/' },
  { name: 'Leopards Courier', trackingUrl: 'https://www.leopardscourier.com/tracking' },
  { name: 'M&P', trackingUrl: 'https://www.mulphilog.com/tracking' },
  { name: 'Trax', trackingUrl: 'https://sonic.pk/tracking' },
  { name: 'PostEx', trackingUrl: 'https://postex.pk/tracking' },
  { name: 'Call Courier', trackingUrl: 'https://callcourier.com.pk/tracking/' },
  { name: 'BlueEX', trackingUrl: 'https://www.blue-ex.com/tracking' },
]

export const builtBy = {
  url: 'https://www.abrarahmed.pro',
  logo: 'https://www.abrarahmed.pro/assets/devAbby-fulllogo-C9-MX7QK.png',
}

export const campaign = {
  name: 'Winter Glow Sale',
  description: 'Long nights, lower prices. Up to 20% off the candles made for winter.',
  endsAt: '2026-11-30',
}

export const coupons: Coupon[] = [
  {
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    maxDiscount: 500,
    description: '10% off your first order, up to Rs. 500',
    firstOrderOnly: true,
    perCustomerLimit: 1,
  },
  {
    code: 'FREESHIPPING',
    type: 'free_shipping',
    value: 0,
    minCart: 3000,
    description: 'Free delivery on orders over Rs. 3,000',
  },
  {
    code: 'EID20',
    type: 'percent',
    value: 20,
    expiresAt: '2026-06-30',
    description: '20% off for Eid',
  },
]

export const cities = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Bahawalpur',
  'Sargodha',
  'Abbottabad',
  'Other',
]

export const sampleOrders: Order[] = [
  {
    number: 'CND-1024',
    placedAt: '2026-11-10T14:20:00+05:00',
    status: 'Dispatched',
    customer: {
      name: 'Sarah Ahmed',
      phone: '03001234567',
      email: 'sarah@example.com',
      city: 'Lahore',
      area: 'DHA Phase 5',
      address: 'House 12, Street 8, Block C',
    },
    lines: [
      { productId: 'p01', name: 'Desi Gulab', variant: '220 g', qty: 1, unitPrice: 1850, originalPrice: 1850 },
      { productId: 'p02', name: 'Chai & Cardamom', variant: '220 g', qty: 1, unitPrice: 1403, originalPrice: 1650 },
    ],
    subtotal: 3253,
    couponDiscount: 0,
    shipping: 250,
    total: 3503,
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Pending Collection',
    shipment: {
      courier: 'TCS',
      trackingId: '779812345601',
      trackingUrl: 'https://www.tcsexpress.com/track/',
      dispatchedAt: '2026-11-12T11:00:00+05:00',
    },
  },
  {
    number: 'CND-1031',
    placedAt: '2026-11-14T19:05:00+05:00',
    status: 'Pending Confirmation',
    customer: {
      name: 'Hamza Tariq',
      phone: '03219876543',
      city: 'Karachi',
      area: 'Clifton Block 4',
      address: 'Flat 3B, Sea View Apartments',
    },
    lines: [
      { productId: 'p04', name: 'Oud Majlis', variant: '300 g', qty: 2, unitPrice: 3450, originalPrice: 3450 },
    ],
    subtotal: 6900,
    couponDiscount: 0,
    shipping: 0,
    total: 6900,
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Pending Collection',
  },
]

export const faqs = [
  {
    q: 'How do I pay?',
    a: 'You pay in cash when the courier hands you the parcel. There is nothing to pay online.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Orders leave our studio within 2 working days. Delivery takes 2 to 4 working days in major cities and up to 6 elsewhere.',
  },
  {
    q: 'How much is delivery?',
    a: 'Delivery is Rs. 250 anywhere in Pakistan, and free on orders over Rs. 5,000.',
  },
  {
    q: 'How do I track my order?',
    a: 'When your order is dispatched we email you the courier name and tracking ID. Open that email, copy the tracking ID and paste it on the courier’s official website. Our Track order page links to every courier we use.',
  },
  {
    q: 'Can I cancel or change my order?',
    a: 'Yes, until it is dispatched. Message us on WhatsApp with your order number and we will sort it out.',
  },
  {
    q: 'My candle arrived damaged. What now?',
    a: 'Send us a photo on WhatsApp within 48 hours of delivery. We will replace it or refund you, whichever you prefer.',
  },
  {
    q: 'What wax do you use?',
    a: 'Most of our candles are soy wax with cotton or wooden wicks. Pillars and tapers use firmer blends so they hold their shape. Each product page lists exactly what is inside.',
  },
  {
    q: 'Do you take custom or bulk orders?',
    a: 'We do, for weddings, corporate gifts and Eid. Tell us the quantity and date on WhatsApp and we will send a quote.',
  },
]

export const careSteps = [
  {
    title: 'Let the first burn reach the edges',
    body: 'Burn a new candle until the whole surface has melted, usually 2 to 3 hours. This stops it tunnelling down the middle later.',
  },
  {
    title: 'Trim the wick to 5 mm',
    body: 'Before every burn, pinch or cut off the blackened tip. A short wick gives a steady flame and keeps the jar clean.',
  },
  {
    title: 'Burn for no more than 4 hours',
    body: 'Put the candle out, let it cool and set, then trim the wick before you light it again.',
  },
  {
    title: 'Stop at the last centimetre',
    body: 'When 1 cm of wax is left, retire the candle. Wash the jar in warm soapy water and reuse it.',
  },
]

export const safetyNotes = [
  'Never leave a burning candle unattended.',
  'Keep it away from curtains, children and pets.',
  'Place it on a flat, heat-resistant surface.',
  'Keep the wax pool free of matches and wick trimmings.',
]

export const policies: Record<
  string,
  { title: string; intro: string; sections: { heading: string; body: string[] }[] }
> = {
  shipping: {
    title: 'Shipping policy',
    intro: 'We deliver across Pakistan through trusted courier companies.',
    sections: [
      {
        heading: 'Delivery charges',
        body: [
          'Delivery is Rs. 250 per order anywhere in Pakistan.',
          'Orders over Rs. 5,000 are delivered free.',
        ],
      },
      {
        heading: 'Delivery time',
        body: [
          'We confirm every order by phone or WhatsApp before packing it.',
          'Orders are dispatched within 2 working days of confirmation and usually arrive 2 to 4 working days after that.',
        ],
      },
      {
        heading: 'Tracking',
        body: [
          'Once your order is dispatched we send you the courier name and tracking number. Use that number on the courier’s official website to follow your parcel.',
        ],
      },
    ],
  },
  returns: {
    title: 'Returns and refunds',
    intro: 'We want you to be happy with every candle you light.',
    sections: [
      {
        heading: 'Damaged or wrong items',
        body: [
          'If your order arrives damaged or incorrect, send us a photo on WhatsApp within 48 hours of delivery.',
          'We will send a replacement at no cost, or refund the amount you paid.',
        ],
      },
      {
        heading: 'Change of mind',
        body: [
          'Unused candles in their original packaging can be returned within 7 days. Return delivery is paid by the customer.',
          'Candles that have been lit cannot be returned.',
        ],
      },
      {
        heading: 'Refunds',
        body: [
          'Refunds are sent by bank transfer, JazzCash or Easypaisa within 5 working days of us receiving the return.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'We collect only what we need to deliver your order.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Your name, phone number and delivery address, and your email address if you choose to give it.',
        ],
      },
      {
        heading: 'How we use it',
        body: [
          'To confirm, deliver and support your order.',
          'We send marketing emails and WhatsApp messages only if you opt in, and you can unsubscribe at any time.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'Only the courier company delivering your parcel. We never sell customer information.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms and conditions',
    intro: 'The basics of ordering from Candle Lit Studio.',
    sections: [
      {
        heading: 'Orders',
        body: [
          'An order is confirmed once we have verified it with you by phone or WhatsApp.',
          'We may cancel orders we cannot verify, or that we cannot fulfil because of stock.',
        ],
      },
      {
        heading: 'Prices',
        body: [
          'All prices are in Pakistani Rupees and include applicable taxes. Delivery is shown separately at checkout.',
        ],
      },
      {
        heading: 'Payment',
        body: ['Payment is by cash on delivery. Please keep the exact amount ready for the rider.'],
      },
    ],
  },
}
