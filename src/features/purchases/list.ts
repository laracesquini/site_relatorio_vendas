import { dec } from '@/domain/decimal'
import type { PurchaseLine } from './api'

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function searchPurchaseLines(lines: PurchaseLine[], term: string) {
  const q = normalize(term.trim())
  if (!q) return lines
  return lines.filter((l) =>
    [l.description, l.inventory_item_name, l.category_name, l.supplier_name, l.purchase_notes].some(
      (f) => f && normalize(f).includes(q),
    ),
  )
}

export type PurchaseTotals = {
  /** Everything spent (cash out). */
  total: number
  /** Materials that entered stock: become cost as they are used. */
  toStock: number
  /** Operational expenses: reduce "Resultado do período". */
  operational: number
  /** Other spending (material not tracked in stock, uncategorized…). */
  other: number
  purchases: number
}

export function sumPurchases(lines: PurchaseLine[]): PurchaseTotals {
  let total = dec(0)
  let toStock = dec(0)
  let operational = dec(0)
  for (const l of lines) {
    const amount = dec(l.total_amount ?? 0)
    total = total.plus(amount)
    if (l.add_to_stock) toStock = toStock.plus(amount)
    else if (l.is_operational) operational = operational.plus(amount)
  }
  return {
    total: total.toNumber(),
    toStock: toStock.toNumber(),
    operational: operational.toNumber(),
    other: total.minus(toStock).minus(operational).toNumber(),
    purchases: new Set(lines.map((l) => l.purchase_id)).size,
  }
}
