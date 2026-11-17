'use client'

import { useState } from 'react'
import { hydrateCatalog, type CatalogSnapshot } from '@/lib/catalog/hydrate'

/**
 * Copies the live catalogue into the browser's data modules before any child
 * renders, so client components (cart, header, pricing) see the same data
 * the server rendered. Renders nothing in demo mode.
 */
export default function CatalogHydrator({ snapshot }: { snapshot: CatalogSnapshot | null }) {
  useState(() => {
    if (snapshot) hydrateCatalog(snapshot)
    return null
  })
  return null
}
