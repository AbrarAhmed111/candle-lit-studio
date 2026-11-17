'use server'

import { fromProduct, fromVariant } from '@/lib/supabase/mappers'
import type { AdminProduct } from '@/components/admin/AdminData'
import { fail, friendly, ok, type ActionResult } from '../result'
import { guard, refreshStore } from './shared'

// Products

export async function adminSaveProduct(product: AdminProduct): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const db = g.supabase

  const { error } = await db.from('products').upsert(fromProduct(product))
  if (error) return fail(friendly(error.message))

  const keep = product.variants.map(v => v.id)
  const { data: existing } = await db.from('variants').select('id').eq('product_id', product.id)
  const gone = (existing ?? []).map(v => v.id).filter(id => !keep.includes(id))
  if (gone.length) {
    const { error: removeError } = await db.from('variants').delete().in('id', gone)
    if (removeError) return fail(friendly(removeError.message))
  }
  const { error: variantError } = await db
    .from('variants')
    .upsert(product.variants.map((v, i) => fromVariant(product.id, v, i)))
  if (variantError) return fail(friendly(variantError.message))

  refreshStore()
  return ok(null)
}

export async function adminDeleteProduct(id: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { error } = await g.supabase.from('products').delete().eq('id', id)
  if (error) return fail(friendly(error.message))
  refreshStore()
  return ok(null)
}

export async function adminUploadImage(form: FormData): Promise<ActionResult<string>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return fail('Choose a photo first.')
  if (file.size > 5 * 1024 * 1024) return fail('That photo is over 5 MB. Choose a smaller one.')
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return fail('Use a JPG, PNG, WebP or AVIF photo.')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`
  const { error } = await g.supabase.storage.from('product-images').upload(path, file, { contentType: file.type })
  if (error) return fail(friendly(error.message))
  return ok(g.supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
}

/** Sets the stock of one size and records why */
export async function adminAdjustStock(variantId: string, stock: number, reason: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { error } = await g.supabase.rpc('adjust_stock', { variant: variantId, new_stock: stock, reason })
  if (error) return fail(friendly(error.message))
  refreshStore()
  return ok(null)
}

export type StockMovement = {
  at: string
  variantId: string
  change: number
  stockAfter: number
  reason: string
  orderNumber?: string
}

export async function adminStockHistory(productId: string): Promise<ActionResult<StockMovement[]>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { data, error } = await g.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('at', { ascending: false })
    .limit(200)
  if (error) return fail(friendly(error.message))
  return ok(
    data.map((m: any) => ({
      at: m.at,
      variantId: m.variant_id,
      change: m.change,
      stockAfter: m.stock_after,
      reason: m.reason,
      orderNumber: m.order_number ?? undefined,
    })),
  )
}
