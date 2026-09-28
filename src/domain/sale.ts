import { dec, roundMoney } from './decimal'

// Financial rules of a sale. The database (create_sale) applies the same
// formulas and is the source of truth; this module drives the live preview.
//
//   fees        = gross − received
//   total cost  = unit cost × quantity
//   profit      = received − total cost
//   margin      = profit / received × 100
//   margin/gross = profit / gross × 100

export type SaleCalcInput = {
  /** Amount paid by the customer, before marketplace fees (whole line). */
  gross: number | null | undefined
  /** Amount actually received after fees (whole line). */
  received: number | null | undefined
  /** Production cost of one unit. */
  unitCost: number | null | undefined
  quantity: number | null | undefined
}

export type SaleSummary = {
  gross: number
  received: number
  fees: number
  /** Fees as a percentage of gross, or null when gross is zero. */
  feePercent: number | null
  unitCost: number
  quantity: number
  totalCost: number
  profit: number
  /** Profit over the amount received, in percent; null when nothing was received. */
  margin: number | null
  /** Profit over gross, in percent; null when gross is zero. */
  marginOverGross: number | null
  /** The amount received is higher than gross, which the database rejects. */
  receivedExceedsGross: boolean
}

const percentOf = (part: ReturnType<typeof dec>, whole: ReturnType<typeof dec>) =>
  whole.isZero() ? null : part.div(whole).times(100).toDecimalPlaces(2).toNumber()

export function calculateSale(input: SaleCalcInput): SaleSummary {
  const gross = dec(roundMoney(input.gross ?? 0))
  const received = dec(roundMoney(input.received ?? 0))
  const quantity = Math.max(0, Math.trunc(input.quantity ?? 0))
  const unitCost = dec(input.unitCost ?? 0)

  const fees = gross.minus(received)
  const totalCost = dec(roundMoney(unitCost.times(quantity)))
  const profit = received.minus(totalCost)

  return {
    gross: gross.toNumber(),
    received: received.toNumber(),
    fees: fees.toNumber(),
    feePercent: percentOf(fees, gross),
    unitCost: unitCost.toNumber(),
    quantity,
    totalCost: totalCost.toNumber(),
    profit: profit.toNumber(),
    margin: percentOf(profit, received),
    marginOverGross: percentOf(profit, gross),
    receivedExceedsGross: received.greaterThan(gross),
  }
}

export type SaleAmounts = {
  quantity: number | null
  gross_amount: number | null
  received_amount: number | null
  fees: number | null
  total_cost: number | null
  profit: number | null
}

export type SalesTotals = {
  lines: number
  units: number
  gross: number
  received: number
  fees: number
  cost: number
  profit: number
  /** Total profit over total received, in percent (weighted, not an average of margins). */
  margin: number | null
}

/** Totals of saved sale lines, using their stored snapshots. */
export function sumSales(lines: SaleAmounts[]): SalesTotals {
  let gross = dec(0)
  let received = dec(0)
  let fees = dec(0)
  let cost = dec(0)
  let profit = dec(0)
  let units = 0
  for (const l of lines) {
    gross = gross.plus(l.gross_amount ?? 0)
    received = received.plus(l.received_amount ?? 0)
    fees = fees.plus(l.fees ?? 0)
    cost = cost.plus(l.total_cost ?? 0)
    profit = profit.plus(l.profit ?? 0)
    units += l.quantity ?? 0
  }
  return {
    lines: lines.length,
    units,
    gross: gross.toNumber(),
    received: received.toNumber(),
    fees: fees.toNumber(),
    cost: cost.toNumber(),
    profit: profit.toNumber(),
    margin: percentOf(profit, received),
  }
}
