import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Json, Tables } from '@/types/database'

export type PurchaseLine = Tables<'purchase_lines'>

export type PurchasePayload = {
  purchase_date: string
  supplier_id: string | null
  notes: string | null
  items: Array<{
    description: string | null
    category_id: string | null
    inventory_item_id: string | null
    quantity: number
    total_amount: number
    add_to_stock: boolean
    stock_qty_per_unit: number
  }>
}

export const purchaseKeys = {
  all: ['purchases'] as const,
  list: (from: string | null, to: string | null) => [...purchaseKeys.all, 'list', from, to] as const,
  detail: (id: string) => [...purchaseKeys.all, 'detail', id] as const,
}

/** Saves the purchase, its lines and stock entries in one transaction. */
export const registerPurchase = (payload: PurchasePayload) =>
  unwrap(supabase.rpc('register_purchase', { p: payload as unknown as Json }))

/** Replaces the lines: old stock entries are reversed, new ones applied. */
export const updatePurchase = (id: string, payload: PurchasePayload) =>
  unwrap(supabase.rpc('update_purchase', { p_purchase_id: id, p: payload as unknown as Json }))

/** Soft-deletes the purchase and reverses its stock entries. */
export const deletePurchase = (id: string) => unwrap(supabase.rpc('delete_purchase', { p_purchase_id: id }))

const PAGE = 1000

export async function listPurchaseLines(from: string | null, to: string | null): Promise<PurchaseLine[]> {
  const rows: PurchaseLine[] = []
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from('purchase_lines')
      .select('*')
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id')
      .range(offset, offset + PAGE - 1)
    if (from) q = q.gte('purchase_date', from)
    if (to) q = q.lte('purchase_date', to)
    const page = await unwrap(q)
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

export const getPurchaseLines = (purchaseId: string) =>
  unwrap(supabase.from('purchase_lines').select('*').eq('purchase_id', purchaseId).order('created_at').order('id'))
