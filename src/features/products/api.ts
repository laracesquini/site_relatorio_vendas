import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Json } from '@/types/database'
import { toProductView, type ProductRow, type VariantCostRow } from './model'
import type { SaveProductPayload } from './schema'

export const productKeys = {
  all: ['products'] as const,
  list: () => [...productKeys.all, 'list'] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
}

const PRODUCT_SELECT = `
  *,
  category:categories(id, name),
  variants:product_variants(
    id, sku, price, cost_override, min_stock, current_qty, is_default, is_active, archived_at,
    values:product_variant_values(
      variation_value_id,
      variation_value:variation_values(value, sort_order, type:variation_types(name, sort_order))
    )
  )
`

async function listVariantCosts(productIds?: string[]) {
  let query = supabase.from('variant_costs').select('variant_id, unit_cost, cost_source')
  if (productIds) query = query.in('product_id', productIds)
  return unwrap(query) as Promise<VariantCostRow[]>
}

export async function listProducts() {
  const [rows, costs] = await Promise.all([
    unwrap(supabase.from('products').select(PRODUCT_SELECT).order('name')),
    listVariantCosts(),
  ])
  return (rows as unknown as ProductRow[]).map((row) => toProductView(row, costs))
}

export async function getProduct(id: string) {
  const [row, costs] = await Promise.all([
    unwrap(supabase.from('products').select(PRODUCT_SELECT).eq('id', id).single()),
    listVariantCosts([id]),
  ])
  return toProductView(row as unknown as ProductRow, costs)
}

export const saveProduct = (payload: SaveProductPayload) =>
  unwrap(supabase.rpc('save_product', { p: payload as unknown as Json }))

export const setProductArchived = (id: string, archived: boolean) =>
  unwrap(
    supabase
      .from('products')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id),
  )

export const deleteProduct = (id: string) =>
  unwrap(supabase.rpc('delete_product', { p_product_id: id }))
