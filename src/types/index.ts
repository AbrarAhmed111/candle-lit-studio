export type CandleShape = 'jar' | 'pillar' | 'tin' | 'taper' | 'set'

export type FragranceFamily =
  | 'Floral'
  | 'Woody'
  | 'Gourmand'
  | 'Fresh'
  | 'Earthy'
  | 'Unscented'

export type Variant = {
  id: string
  label: string
  sku: string
  price: number
  stock: number
  weight?: string
  burnTime?: string
}

export type Product = {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  categories: string[]
  tags: string[]
  fragrance?: string
  fragranceFamily: FragranceFamily
  notes?: { top: string; middle: string; base: string }
  waxType?: string
  colour?: string
  dimensions?: string
  ingredients?: string
  art: { shape: CandleShape; wax: string; vessel: string; bg: string }
  /** Unsplash photo ids, first one is the main photo */
  images: string[]
  variants: Variant[]
  discountPercent?: number
  rating: number
  reviewCount: number
  sold: number
  createdAt: string
  featured?: boolean
  bestSeller?: boolean
  isNew?: boolean
}

export type Category = {
  slug: string
  name: string
  description: string
  cover: string
}

export type Review = {
  id: string
  productId: string
  author: string
  city: string
  rating: number
  title: string
  body: string
  date: string
  verified: boolean
}

export type CartItem = {
  productId: string
  variantId: string
  qty: number
}

export type Coupon = {
  code: string
  type: 'percent' | 'fixed' | 'free_shipping'
  value: number
  minCart?: number
  maxDiscount?: number
  expiresAt?: string
  description: string
}

export type OrderStatus =
  | 'Pending Confirmation'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Dispatched'
  | 'Delivered'
  | 'Cancelled'

// COD money moves in three steps: customer pays the courier, the courier
// holds it, then the courier settles with the business.
export type PaymentStatus =
  | 'Pending Collection'
  | 'Collected by Courier'
  | 'Settled to Business'

export type OrderLine = {
  name: string
  variant: string
  qty: number
  unitPrice: number
  originalPrice: number
  productId: string
}

export type Order = {
  number: string
  placedAt: string
  status: OrderStatus
  customer: {
    name: string
    phone: string
    email?: string
    city: string
    area: string
    address: string
    landmark?: string
    notes?: string
  }
  lines: OrderLine[]
  subtotal: number
  couponCode?: string
  couponDiscount: number
  shipping: number
  total: number
  paymentMethod: 'Cash on Delivery'
  paymentStatus: PaymentStatus
  shipment?: {
    courier: string
    trackingId: string
    trackingUrl: string
    dispatchedAt: string
  }
}
