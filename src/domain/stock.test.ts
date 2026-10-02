import { describe, expect, it } from 'vitest'
import { averageAfterEntry, calculatePurchaseLine, purchaseTotal } from './stock'

describe('averageAfterEntry', () => {
  it('weights the two purchases: 1 kg for R$ 100 then 1 kg for R$ 120 → R$ 0,11/g', () => {
    expect(averageAfterEntry(1000, 0.1, 1000, 0.12)).toBe(0.11)
  })

  it('weights by quantity, not by number of purchases', () => {
    // 900 g at R$ 0,10 + 100 g at R$ 0,20
    expect(averageAfterEntry(900, 0.1, 100, 0.2)).toBe(0.11)
  })

  it('uses the entry cost when stock is empty or negative', () => {
    expect(averageAfterEntry(0, 0.5, 100, 0.34)).toBe(0.34)
    expect(averageAfterEntry(-5, 0.5, 100, 0.34)).toBe(0.34)
  })
})

describe('calculatePurchaseLine', () => {
  it('computes the unit price of a purchase (100 argolas por R$ 34,11)', () => {
    expect(calculatePurchaseLine({ quantity: 100, totalAmount: 34.11 })).toEqual({
      unitPrice: 0.3411,
      stockQuantity: 100,
      stockUnitCost: 0.3411,
    })
  })

  it('converts purchased units into stock units (1 rolo = 1000 g)', () => {
    expect(calculatePurchaseLine({ quantity: 1, totalAmount: 113.9, stockQtyPerUnit: 1000 })).toEqual({
      unitPrice: 113.9,
      stockQuantity: 1000,
      stockUnitCost: 0.1139,
    })
    expect(calculatePurchaseLine({ quantity: 2, totalAmount: 154, stockQtyPerUnit: 1000 })).toMatchObject({
      unitPrice: 77,
      stockQuantity: 2000,
      stockUnitCost: 0.077,
    })
  })

  it('returns nothing until quantity and total are valid', () => {
    expect(calculatePurchaseLine({ quantity: null, totalAmount: 10 }).unitPrice).toBeNull()
    expect(calculatePurchaseLine({ quantity: 0, totalAmount: 10 }).unitPrice).toBeNull()
    expect(calculatePurchaseLine({ quantity: 1, totalAmount: -1 }).unitPrice).toBeNull()
  })

  it('handles free items', () => {
    expect(calculatePurchaseLine({ quantity: 10, totalAmount: 0 }).stockUnitCost).toBe(0)
  })
})

describe('purchaseTotal', () => {
  it('sums the spreadsheet purchases exactly', () => {
    expect(purchaseTotal([34.11, 113.9, 39.99, 43, 34.1, 77])).toBe(342.1)
  })
})
