'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAdmin } from '@/components/admin/AdminData'
import ProductForm from '@/components/admin/ProductForm'
import { card, Empty } from '@/components/admin/ui'

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const { products } = useAdmin()
  const product = products.find(p => p.id === id)

  if (!product) {
    return (
      <div className={card}>
        <Empty title="Product not found" text="It may have been deleted.">
          <Link href="/admin/products" className="btn-primary">
            Back to products
          </Link>
        </Empty>
      </div>
    )
  }
  return <ProductForm key={product.id} product={product} />
}
