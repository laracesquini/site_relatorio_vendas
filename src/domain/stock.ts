import { dec, roundMoney, roundUnitCost } from './decimal'

// Inventory cost rules. The database (apply_stock_movement) applies them and is
// the source of truth; these functions drive the previews in the forms.

/**
 * Weighted average cost after an entry:
 *   (qty·avg + in_qty·in_cost) / (qty + in_qty)
 * When the current balance is zero or negative, the entry's cost becomes the average.
 */
export function averageAfterEntry(currentQty: number, currentAvg: number, entryQty: number, entryUnitCost: number) {
  if (currentQty <= 0) return roundUnitCost(entryUnitCost)
  const total = dec(currentQty).times(currentAvg).plus(dec(entryQty).times(entryUnitCost))
  return roundUnitCost(total.div(dec(currentQty).plus(entryQty)))
}

export type PurchaseLineInput = {
  quantity: number | null | undefined
  totalAmount: number | null | undefined
  /** Stock units per purchased unit (1 rolo = 1000 g); defaults to 1. */
  stockQtyPerUnit?: number | null
}

export type PurchaseLineCalc = {
  /** Price per purchased unit (per rolo, per pacote…). */
  unitPrice: number | null
  /** Quantity that enters stock, in the item's unit. */
  stockQuantity: number | null
  /** Cost per stock unit (per g, per un…). */
  stockUnitCost: number | null
}

export function calculatePurchaseLine({ quantity, totalAmount, stockQtyPerUnit }: PurchaseLineInput): PurchaseLineCalc {
  if (!quantity || quantity <= 0 || totalAmount === null || totalAmount === undefined || totalAmount < 0) {
    return { unitPrice: null, stockQuantity: null, stockUnitCost: null }
  }
  const total = dec(roundMoney(totalAmount))
  const factor = stockQtyPerUnit && stockQtyPerUnit > 0 ? stockQtyPerUnit : 1
  const stockQuantity = dec(quantity).times(factor)
  return {
    unitPrice: roundUnitCost(total.div(quantity)),
    stockQuantity: stockQuantity.toNumber(),
    stockUnitCost: roundUnitCost(total.div(stockQuantity)),
  }
}

/** Sum of line totals, in cents-exact decimal. */
export const purchaseTotal = (totals: Array<number | null | undefined>) =>
  totals.reduce<ReturnType<typeof dec>>((sum, t) => sum.plus(roundMoney(t ?? 0)), dec(0)).toNumber()
