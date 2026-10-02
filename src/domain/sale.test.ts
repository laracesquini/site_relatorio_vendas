import { describe, expect, it } from 'vitest'
import { calculateSale, sumSales } from './sale'

describe('calculateSale', () => {
  it('matches the spec example: R$ 30,00 → R$ 19,40 with R$ 10,90 cost', () => {
    const s = calculateSale({ gross: 30, received: 19.4, unitCost: 10.9, quantity: 1 })
    expect(s.fees).toBe(10.6)
    expect(s.totalCost).toBe(10.9)
    expect(s.profit).toBe(8.5)
    expect(s.margin).toBe(43.81)
    expect(s.marginOverGross).toBe(28.33)
    expect(s.feePercent).toBe(35.33)
  })

  it('multiplies the unit cost by the quantity and rounds to cents', () => {
    const s = calculateSale({ gross: 24, received: 20, unitCost: 2.045, quantity: 3 })
    expect(s.totalCost).toBe(6.14) // 6.135 rounds half up
    expect(s.profit).toBe(13.86)
  })

  it('handles unit costs with more than 2 decimals (R$/g)', () => {
    // 15 g × R$ 0,1139/g, one unit
    const s = calculateSale({ gross: 10, received: 8, unitCost: 15 * 0.1139, quantity: 1 })
    expect(s.totalCost).toBe(1.71)
  })

  it('does not drift with float arithmetic', () => {
    const s = calculateSale({ gross: 0.3, received: 0.1 + 0.2, unitCost: 0.1, quantity: 3 })
    expect(s.fees).toBe(0)
    expect(s.totalCost).toBe(0.3)
    expect(s.profit).toBe(0)
  })

  it('reports a loss as negative profit and margin', () => {
    const s = calculateSale({ gross: 20, received: 15, unitCost: 20, quantity: 1 })
    expect(s.profit).toBe(-5)
    expect(s.margin).toBe(-33.33)
  })

  it('has no fees for a direct sale', () => {
    const s = calculateSale({ gross: 30, received: 30, unitCost: 10, quantity: 1 })
    expect(s.fees).toBe(0)
    expect(s.feePercent).toBe(0)
  })

  it('returns null margins instead of dividing by zero', () => {
    const s = calculateSale({ gross: 0, received: 0, unitCost: 5, quantity: 1 })
    expect(s.margin).toBeNull()
    expect(s.marginOverGross).toBeNull()
    expect(s.feePercent).toBeNull()
  })

  it('flags received greater than gross', () => {
    expect(calculateSale({ gross: 30, received: 31, unitCost: 0, quantity: 1 }).receivedExceedsGross).toBe(true)
    expect(calculateSale({ gross: 30, received: 30, unitCost: 0, quantity: 1 }).receivedExceedsGross).toBe(false)
  })

  it('treats empty fields as zero while the form is being filled', () => {
    const s = calculateSale({ gross: null, received: undefined, unitCost: null, quantity: null })
    expect(s).toMatchObject({ gross: 0, received: 0, totalCost: 0, profit: 0, quantity: 0 })
  })
})

describe('sumSales', () => {
  const line = (gross: number, received: number, cost: number, quantity = 1) => ({
    quantity,
    gross_amount: gross,
    received_amount: received,
    fees: roundDiff(gross, received),
    total_cost: cost,
    profit: roundDiff(received, cost),
  })
  const roundDiff = (a: number, b: number) => Math.round((a - b) * 100) / 100

  it('adds up the snapshots and computes the weighted margin', () => {
    const t = sumSales([line(30, 19.4, 10.9), line(20, 20, 5, 2)])
    expect(t).toMatchObject({ lines: 2, units: 3, gross: 50, received: 39.4, fees: 10.6, cost: 15.9, profit: 23.5 })
    // 23.5 / 39.4, not the average of 43.81% and 75%
    expect(t.margin).toBe(59.64)
  })

  it('sums cents exactly', () => {
    const t = sumSales(Array.from({ length: 10 }, () => line(0.1, 0.1, 0)))
    expect(t.gross).toBe(1)
  })

  it('returns zeros and no margin for an empty list', () => {
    expect(sumSales([])).toMatchObject({ lines: 0, gross: 0, profit: 0, margin: null })
  })
})
