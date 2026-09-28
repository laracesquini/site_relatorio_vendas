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
