import { dec, roundMoney } from '@/domain/decimal'
import { todayISO } from '@/lib/format'

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT'

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  IN: 'Entrada',
  OUT: 'Saída',
  ADJUSTMENT: 'Ajuste',
}

type OriginFields = {
  reason: string | null
  notes: string | null
  movement_type: string | null
  reverses_movement_id: string | null
  sale_id: string | null
  sale_product_name: string | null
  purchase_id: string | null
  purchase_description: string | null
  production_id: string | null
}

/** Where a movement came from, in words: "Venda · Chaveiro", "Compra · PLA", "Perda"… */
export function describeOrigin(m: OriginFields): string {
  const reversal = m.reverses_movement_id !== null
  if (m.sale_id) return `${reversal ? 'Estorno de venda' : 'Venda'} · ${m.sale_product_name ?? ''}`.trim()
  if (m.purchase_id) return `${reversal ? 'Estorno de compra' : 'Compra'} · ${m.purchase_description ?? ''}`.trim()
  if (m.production_id) {
    const producing = m.movement_type === 'IN'
    if (reversal) return 'Estorno de produção'
    return producing ? 'Produção' : 'Consumo na produção'
  }
  if (m.reason === 'loss') return 'Perda'
  if (m.movement_type === 'ADJUSTMENT') return 'Ajuste de inventário'
  return m.movement_type === 'IN' ? 'Entrada manual' : 'Saída manual'
}

/** Value at average cost; negative balances count as zero. */
export function stockValue(quantity: number, avgCost: number) {
  return roundMoney(dec(Math.max(0, quantity)).times(avgCost))
}

export const isLowStock = (quantity: number, minimum: number) => minimum > 0 && quantity < minimum

/**
 * Timestamp for a movement dated `date` (YYYY-MM-DD): undefined for today (the
 * database uses "now"), otherwise noon in Brazil so it never shifts a day.
 */
export function movementTimestamp(date: string, today = todayISO()) {
  return date === today ? undefined : `${date}T12:00:00-03:00`
}

/** Balance after an OUT of `quantity`, to warn before it goes negative. */
export const balanceAfterOut = (current: number, quantity: number) => dec(current).minus(quantity).toNumber()
