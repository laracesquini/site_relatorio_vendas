import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Json, Tables } from '@/types/database'

export type SaleLine = Tables<'sale_lines'>

export type SaleLineFilters = {
  from: string | null
  to: string | null
  channelId: string | null
  productId: string | null
  categoryId: string | null
  customized: boolean | null
}

export const salesKeys = {
  all: ['sales'] as const,
  list: (filters: SaleLineFilters) => [...salesKeys.all, 'list', filters] as const,
  recentProducts: () => [...salesKeys.all, 'recent-products'] as const,
}

export type CreateSalePayload = {
  sale_date: string
  channel_id: string
  received_amount: number
  notes: string | null
  items: Array<{
    variant_id: string
    quantity: number
    gross_amount: number
    unit_cost: number
    is_customized: boolean
    customization_notes: string | null
  }>
}

/** Creates the sale, its items and stock movements in one transaction. */
export const createSale = (payload: CreateSalePayload) =>
  unwrap(supabase.rpc('create_sale', { p: payload as unknown as Json }))

/** Replaces the sale's items; stock is reversed and re-applied in one transaction. */
export const updateSale = (saleId: string, payload: CreateSalePayload) =>
  unwrap(supabase.rpc('update_sale', { p_sale_id: saleId, p: payload as unknown as Json }))

/** Soft-deletes the sale and returns any stock it consumed. */
export const deleteSale = (saleId: string) =>
  unwrap(supabase.rpc('delete_sale', { p_sale_id: saleId }))

// Supabase returns at most 1000 rows per request, so large ranges are paged.
const PAGE = 1000

export async function listSaleLines(f: SaleLineFilters): Promise<SaleLine[]> {
  const rows: SaleLine[] = []
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from('sale_lines')
      .select('*')
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id')
      .range(offset, offset + PAGE - 1)
    if (f.from) q = q.gte('sale_date', f.from)
    if (f.to) q = q.lte('sale_date', f.to)
    if (f.channelId) q = q.eq('channel_id', f.channelId)
    if (f.productId) q = q.eq('product_id', f.productId)
    if (f.categoryId) q = q.eq('category_id', f.categoryId)
    if (f.customized !== null) q = q.eq('is_customized', f.customized)
    const page = await unwrap(q)
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

/** Product ids ordered by most recent sale, for the product picker. */
export async function listRecentlySoldProductIds() {
  const rows = await unwrap(
    supabase
      .from('sale_lines')
      .select('product_id')
      .order('created_at', { ascending: false })
      .limit(200),
  )
  return [...new Set(rows.map((r) => r.product_id).filter((id): id is string => Boolean(id)))]
}
