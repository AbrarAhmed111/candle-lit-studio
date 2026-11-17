export type CandleShape = 'jar' | 'pillar' | 'tin' | 'taper' | 'set'

export type FragranceFamily = 'Floral' | 'Woody' | 'Gourmand' | 'Fresh' | 'Earthy' | 'Unscented'

export type Variant = {
  id: string
  label: string
  sku: string
  price: number
  stock: number
  weight?: string
  burnTime?: string
}

/** A colour a customer can choose. Stock is shared by every colour of a size. */
export type ProductColour = { name: string; hex: string }

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
  /** Colours the customer chooses from. Empty or missing means no choice. */
  colours?: ProductColour[]
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
  /** Parent category, for subcategories */
  parent?: string
  /** Photo for category cards and the banner at the top of the category page */
  image?: string
  banner?: string
  seoTitle?: string
  seoDescription?: string
  /** Hidden from the store without deleting it */
  archived?: boolean
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
  /** Photos the customer added */
  images?: string[]
}

export type CartItem = {
  productId: string
  variantId: string
  qty: number
  /** Chosen colour name, for products that come in colours */
  colour?: string
}

export type Coupon = {
  code: string
  type: 'percent' | 'fixed' | 'free_shipping'
  value: number
  minCart?: number
  maxDiscount?: number
  expiresAt?: string
  description: string
  /** Only for a customer's first order */
  firstOrderOnly?: boolean
  /** How many times one customer may use it */
  perCustomerLimit?: number
  /** Limits the discount to these products or categories. Empty means everything. */
  productIds?: string[]
  categories?: string[]
}

export type OrderStatus =
  | 'Pending Confirmation'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Cancellation Requested'
  | 'Dispatched'
  | 'Delivered'
  | 'Failed Delivery'
  | 'Returned'
  | 'Cancelled'

// Cash on delivery (Quetta) moves in three steps: customer pays the courier,
// the courier holds it, then the courier settles with the business.
// Easypaisa (every other city) is checked by hand: Pending Verification,
// then Paid or Payment Rejected.
export type PaymentStatus =
  | 'Pending Collection'
  | 'Collected by Courier'
  | 'Settled to Business'
  | 'Reconciliation Required'
  | 'Disputed'
  | 'Adjusted'
  | 'Pending Verification'
  | 'Paid'
  | 'Payment Rejected'

export type OrderLine = {
  name: string
  variant: string
  colour?: string
  qty: number
  unitPrice: number
  originalPrice: number
  productId: string
  variantId?: string
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
    postalCode?: string
    notes?: string
  }
  lines: OrderLine[]
  invoiceNumber?: number
  whatsappOptIn?: boolean
  /** Set when the customer asked to cancel */
  cancelRequest?: { at: string; reason: string }
  subtotal: number
  couponCode?: string
  couponDiscount: number
  shipping: number
  total: number
  paymentMethod: 'Cash on Delivery' | 'Easypaisa'
  paymentStatus: PaymentStatus
  /** What the customer sent for an Easypaisa payment */
  payment?: {
    reference?: string
    submittedAt?: string
    verifiedAt?: string
    rejectionReason?: string
    /** Screenshot path in private storage. Only the dashboard gets it. */
    proof?: string
  }
  shipment?: {
    courier: string
    trackingId: string
    trackingUrl: string
    dispatchedAt: string
    notes?: string
  }
}
