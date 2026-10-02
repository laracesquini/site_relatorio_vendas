import { dec, roundUnitCost } from './decimal'

// Production cost from a cost sheet (ficha de custo). The database view
// variant_costs applies the same rules; these functions drive the previews.
//
//   unit cost = Σ(material quantity × material average cost) + Σ extra costs
//
// A variant with its own material rows uses only those; otherwise it uses the
// product-level rows. Extra costs always come from the product.

export type SheetMaterial = {
  inventoryItemId: string
  quantity: number
  /** Current average cost of one unit of the material (R$/g, R$/un…). */
  unitCost: number
  /** null = product-level row; otherwise the variant's own sheet. */
  variantId: string | null
}

/** The material rows that apply to a variant. */
export function resolveSheet<T extends Pick<SheetMaterial, 'variantId'>>(rows: T[], variantId: string | null): T[] {
  const own = variantId ? rows.filter((r) => r.variantId === variantId) : []
  return own.length > 0 ? own : rows.filter((r) => r.variantId === null)
}

export type SheetCost = { materials: number; extras: number; total: number }

export function sheetCost(
  materials: Array<Pick<SheetMaterial, 'quantity' | 'unitCost'>>,
  extraCosts: Array<number | null | undefined>,
): SheetCost {
  const m = materials.reduce((sum, r) => sum.plus(dec(r.quantity ?? 0).times(r.unitCost ?? 0)), dec(0))
  const e = extraCosts.reduce<ReturnType<typeof dec>>((sum, a) => sum.plus(a ?? 0), dec(0))
  return { materials: roundUnitCost(m), extras: roundUnitCost(e), total: roundUnitCost(m.plus(e)) }
}

/** Materials consumed by `units` pieces: what a sale or a production takes from stock. */
export function materialsToDeduct<T extends Pick<SheetMaterial, 'inventoryItemId' | 'quantity'>>(
  rows: T[],
  units: number,
): Array<T & { total: number }> {
  return rows.map((r) => ({ ...r, total: dec(r.quantity).times(units).toNumber() }))
}

/** Share of the selling price left after production cost, before marketplace fees. */
export function marginOnPrice(price: number, unitCost: number): number | null {
  if (!price) return null
  return dec(price).minus(unitCost).div(price).times(100).toDecimalPlaces(2).toNumber()
}
