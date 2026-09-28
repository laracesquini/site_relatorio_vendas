import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Json, Tables } from '@/types/database'

export type SaleLine = Tables<'sale_lines'>

export const salesKeys = {
  all: ['sales'] as const,
  recent: () => [...salesKeys.all, 'recent'] as const,
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

export const listRecentSales = (limit = 10) =>
  unwrap(
    supabase
      .from('sale_lines')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
  )

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
