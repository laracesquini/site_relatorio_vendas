import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Json } from '@/types/database'
import { productKeys } from '../api'

export type CostSheetMaterial = {
  id: string
  variantId: string | null
  inventoryItemId: string
  quantity: number
  item: { name: string; unit: string; avgCost: number; currentQty: number }
}

export type CostSheetExtra = { id: string; label: string; amount: number }

export type CostSheet = { materials: CostSheetMaterial[]; extras: CostSheetExtra[] }

export const costSheetKey = (productId: string) => [...productKeys.all, 'cost-sheet', productId] as const

type MaterialRow = {
  id: string
  variant_id: string | null
  inventory_item_id: string
  quantity: number
  item: { name: string; avg_cost: number; current_qty: number; unit: { code: string } | null } | null
}

export async function getCostSheet(productId: string): Promise<CostSheet> {
  const [materials, extras] = await Promise.all([
    unwrap(
      supabase
        .from('product_materials')
        .select('id, variant_id, inventory_item_id, quantity, item:inventory_items(name, avg_cost, current_qty, unit:units(code))')
        .eq('product_id', productId)
        .order('created_at'),
    ),
    unwrap(supabase.from('product_extra_costs').select('id, label, amount').eq('product_id', productId).order('sort_order')),
  ])
  return {
    materials: (materials as unknown as MaterialRow[]).map((m) => ({
      id: m.id,
      variantId: m.variant_id,
      inventoryItemId: m.inventory_item_id,
      quantity: Number(m.quantity),
      item: {
        name: m.item?.name ?? '',
        unit: m.item?.unit?.code ?? '',
        avgCost: Number(m.item?.avg_cost ?? 0),
        currentQty: Number(m.item?.current_qty ?? 0),
      },
    })),
    extras: extras.map((e) => ({ id: e.id, label: e.label, amount: Number(e.amount) })),
  }
}

export type SaveCostSheetPayload = {
  materials: Array<{ inventory_item_id: string; quantity: number; variant_id: string | null }>
  extra_costs: Array<{ label: string; amount: number }>
}

/** Replaces the product's cost sheet in one transaction. */
export const saveCostSheet = (productId: string, payload: SaveCostSheetPayload) =>
  unwrap(supabase.rpc('save_cost_sheet', { p_product_id: productId, p: payload as unknown as Json }))

export const useCostSheet = (productId: string | null | undefined) =>
  useQuery({
    queryKey: costSheetKey(productId ?? ''),
    queryFn: () => getCostSheet(productId!),
    enabled: Boolean(productId),
  })
