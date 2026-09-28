import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Json, Tables } from '@/types/database'
import type { MovementType } from './movements'

export type InventoryItem = Tables<'inventory_items'> & {
  unit: { code: string; name: string } | null
  category: { name: string } | null
  supplier: { name: string } | null
}

export type FinishedGood = {
  id: string
  sku: string
  label: string
  productId: string
  productName: string
  currentQty: number
  minStock: number
  avgCost: number
  isActive: boolean
}

export type MovementRow = Tables<'stock_movement_history'>

/** The thing a movement applies to: a material or a finished product variant. */
export type StockTarget =
  | { kind: 'material'; id: string; name: string; unit: string; currentQty: number; avgCost: number }
  | { kind: 'product'; id: string; name: string; unit: 'un'; currentQty: number; avgCost: number }

export const inventoryKeys = {
  all: ['inventory'] as const,
  items: () => [...inventoryKeys.all, 'items'] as const,
  finished: () => [...inventoryKeys.all, 'finished'] as const,
  movements: (filters: MovementFilters) => [...inventoryKeys.all, 'movements', filters] as const,
}

// Materials -------------------------------------------------------------------

export const listInventoryItems = async () =>
  (await unwrap(
    supabase
      .from('inventory_items')
      .select('*, unit:units(code, name), category:categories(name), supplier:suppliers(name)')
      .order('name'),
  )) as unknown as InventoryItem[]

export type SaveInventoryItemPayload = {
  id?: string
  name: string
  category_id: string | null
  unit_id: string
  min_qty: number
  supplier_id: string | null
  notes: string | null
  initial_qty?: number | null
  initial_unit_cost?: number | null
}

export const saveInventoryItem = (payload: SaveInventoryItemPayload) =>
  unwrap(supabase.rpc('save_inventory_item', { p: payload as unknown as Json }))

export const setInventoryItemArchived = (id: string, archived: boolean) =>
  unwrap(
    supabase
      .from('inventory_items')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id),
  )

export const deleteInventoryItem = (id: string) =>
  unwrap(supabase.from('inventory_items').delete().eq('id', id))

// Finished products (variants of "estoque pronto" products) --------------------

type FinishedRow = {
  id: string
  sku: string
  current_qty: number
  min_stock: number
  avg_cost: number
  is_active: boolean
  is_default: boolean
  product: { id: string; name: string } | null
  values: Array<{ variation_value: { value: string; type: { sort_order: number } | null } | null }>
}

export async function listFinishedGoods(): Promise<FinishedGood[]> {
  const rows = (await unwrap(
    supabase
      .from('product_variants')
      .select(
        `id, sku, current_qty, min_stock, avg_cost, is_active, is_default,
         product:products!inner(id, name),
         values:product_variant_values(variation_value:variation_values(value, type:variation_types(sort_order)))`,
      )
      .eq('product.stock_mode', 'stocked')
      .is('product.archived_at', null)
      .is('archived_at', null),
  )) as unknown as FinishedRow[]

  return rows
    .map((r) => ({
      id: r.id,
      sku: r.sku,
      label: r.is_default
        ? ''
        : [...r.values]
            .sort((a, b) => (a.variation_value?.type?.sort_order ?? 0) - (b.variation_value?.type?.sort_order ?? 0))
            .map((v) => v.variation_value?.value)
            .filter(Boolean)
            .join(' / '),
      productId: r.product?.id ?? '',
      productName: r.product?.name ?? '',
      currentQty: Number(r.current_qty),
      minStock: Number(r.min_stock),
      avgCost: Number(r.avg_cost),
      isActive: r.is_active,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName, 'pt-BR') || a.label.localeCompare(b.label, 'pt-BR'))
}

// Movements -------------------------------------------------------------------

const targetArgs = (t: StockTarget) =>
  t.kind === 'material' ? { p_inventory_item_id: t.id } : { p_product_variant_id: t.id }

export function registerMovement(input: {
  target: StockTarget
  type: 'IN' | 'OUT'
  quantity: number
  unitCost: number | null
  reason: 'manual' | 'loss'
  notes: string | null
  occurredAt?: string
}) {
  return unwrap(
    supabase.rpc('register_stock_movement', {
      ...targetArgs(input.target),
      p_movement_type: input.type,
      p_quantity: input.quantity,
      ...(input.unitCost !== null ? { p_unit_cost: input.unitCost } : {}),
      p_reason: input.reason,
      ...(input.notes ? { p_notes: input.notes } : {}),
      ...(input.occurredAt ? { p_occurred_at: input.occurredAt } : {}),
    }),
  )
}

export function adjustStockTo(input: { target: StockTarget; counted: number; notes: string | null; occurredAt?: string }) {
  return unwrap(
    supabase.rpc('adjust_stock_to', {
      ...targetArgs(input.target),
      p_counted: input.counted,
      ...(input.notes ? { p_notes: input.notes } : {}),
      ...(input.occurredAt ? { p_occurred_at: input.occurredAt } : {}),
    }),
  )
}

export function registerProduction(input: { variantId: string; quantity: number; date: string; notes: string | null }) {
  return unwrap(
    supabase.rpc('register_production', {
      p_variant_id: input.variantId,
      p_quantity: input.quantity,
      p_produced_at: input.date,
      ...(input.notes ? { p_notes: input.notes } : {}),
    }),
  )
}

export type MovementFilters = {
  inventoryItemId?: string | null
  productVariantId?: string | null
  kind?: 'material' | 'product' | null
  type?: MovementType | null
  from?: string | null
  to?: string | null
}

const MOVEMENT_LIMIT = 500

/** Most recent movements matching the filters (dates are calendar days in Brazil). */
export async function listMovements(f: MovementFilters) {
  let q = supabase
    .from('stock_movement_history')
    .select('*')
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MOVEMENT_LIMIT)
  if (f.inventoryItemId) q = q.eq('inventory_item_id', f.inventoryItemId)
  if (f.productVariantId) q = q.eq('product_variant_id', f.productVariantId)
  if (f.kind) q = q.eq('kind', f.kind)
  if (f.type) q = q.eq('movement_type', f.type)
  if (f.from) q = q.gte('occurred_at', `${f.from}T00:00:00-03:00`)
  if (f.to) q = q.lte('occurred_at', `${f.to}T23:59:59.999-03:00`)
  return unwrap(q)
}

export const MOVEMENTS_SHOWN_LIMIT = MOVEMENT_LIMIT
