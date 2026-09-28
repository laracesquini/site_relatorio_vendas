import type { Tables } from '@/types/database'
import { variantLabel } from './variants'

// Shape returned by the products query (see PRODUCT_SELECT in api.ts).
export type ProductRow = Tables<'products'> & {
  category: { id: string; name: string } | null
  variants: Array<
    Pick<
      Tables<'product_variants'>,
      | 'id'
      | 'sku'
      | 'price'
      | 'cost_override'
      | 'min_stock'
      | 'current_qty'
      | 'is_default'
      | 'is_active'
      | 'archived_at'
    > & {
      values: Array<{
        variation_value_id: string
        variation_value: {
          value: string
          sort_order: number
          type: { name: string; sort_order: number } | null
        } | null
      }>
    }
  >
}

export type CostSource = 'override' | 'sheet' | 'estimate'
export type VariantCostRow = { variant_id: string | null; unit_cost: number | null; cost_source: string | null }

export type VariantView = {
  id: string
  sku: string
  label: string
  valueIds: string[]
  /** Price stored on the variant (null = uses the product's default price). */
  ownPrice: number | null
  /** Price actually charged by default. */
  price: number
  costOverride: number | null
  /** Current unit cost (override → cost sheet → product estimate). */
  unitCost: number
  costSource: CostSource
  currentQty: number
  minStock: number
  isDefault: boolean
  isActive: boolean
  isLowStock: boolean
}

export type ProductView = Omit<ProductRow, 'variants'> & {
  stockMode: 'made_to_order' | 'stocked'
  hasVariations: boolean
  /** Active (non-archived) variants. */
  variants: VariantView[]
  priceRange: [number, number]
  costRange: [number, number]
  totalStock: number
  lowStockCount: number
}

const range = (values: number[]): [number, number] =>
  values.length ? [Math.min(...values), Math.max(...values)] : [0, 0]

export function toProductView(row: ProductRow, costs: VariantCostRow[]): ProductView {
  const costByVariant = new Map(costs.map((c) => [c.variant_id, c]))
  const stockMode = row.stock_mode === 'stocked' ? 'stocked' : 'made_to_order'

  const variants = row.variants
    .filter((v) => !v.archived_at)
    .map<VariantView>((v) => {
      const values = [...v.values].sort(
        (a, b) =>
          (a.variation_value?.type?.sort_order ?? 0) - (b.variation_value?.type?.sort_order ?? 0),
      )
      const cost = costByVariant.get(v.id)
      const currentQty = Number(v.current_qty)
      const minStock = Number(v.min_stock)
      return {
        id: v.id,
        sku: v.sku,
        label: v.is_default ? 'Padrão' : variantLabel(values.map((x) => x.variation_value?.value ?? '')),
        valueIds: values.map((x) => x.variation_value_id),
        ownPrice: v.price,
        price: v.price ?? row.default_price,
        costOverride: v.cost_override,
        unitCost: Number(cost?.unit_cost ?? row.estimated_cost),
        costSource: (cost?.cost_source as CostSource) ?? 'estimate',
        currentQty,
        minStock,
        isDefault: v.is_default,
        isActive: v.is_active,
        isLowStock: stockMode === 'stocked' && minStock > 0 && currentQty < minStock,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  const active = variants.filter((v) => v.isActive)
  return {
    ...row,
    stockMode,
    hasVariations: variants.some((v) => !v.isDefault),
    variants,
    priceRange: range(active.map((v) => v.price)),
    costRange: range(active.map((v) => v.unitCost)),
    totalStock: variants.reduce((sum, v) => sum + v.currentQty, 0),
    lowStockCount: variants.filter((v) => v.isLowStock).length,
  }
}
