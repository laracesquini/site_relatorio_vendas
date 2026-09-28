import { describe, expect, it } from 'vitest'
import { marginOnPrice, materialsToDeduct, resolveSheet, sheetCost } from './cost'

const row = (inventoryItemId: string, quantity: number, unitCost: number, variantId: string | null = null) => ({
  inventoryItemId,
  quantity,
  unitCost,
  variantId,
})

describe('sheetCost', () => {
  it('prices the spec keychain: PLA 15 g at R$ 0,10/g + argola R$ 0,34 + embalagem R$ 0,20 = R$ 2,04', () => {
    const c = sheetCost([row('pla', 15, 0.1), row('argola', 1, 0.34), row('emb', 1, 0.2)], [])
    expect(c).toEqual({ materials: 2.04, extras: 0, total: 2.04 })
  })

  it('adds extra costs per unit', () => {
    expect(sheetCost([row('pla', 15, 0.1)], [0.12, 1]).total).toBe(2.62)
  })

  it('keeps sub-cent precision of gram costs', () => {
    // 7 g × R$ 0,1139 = R$ 0,7973
    expect(sheetCost([row('pla', 7, 0.1139)], []).total).toBe(0.7973)
  })

  it('is zero for an empty sheet', () => {
    expect(sheetCost([], [])).toEqual({ materials: 0, extras: 0, total: 0 })
  })
})

describe('resolveSheet', () => {
  const rows = [row('pla', 50, 0.1), row('emb', 1, 0.2), row('pla', 120, 0.1, 'grande')]

  it('uses the variant sheet when it has one', () => {
    expect(resolveSheet(rows, 'grande').map((r) => r.quantity)).toEqual([120])
  })

  it('falls back to the product sheet', () => {
    expect(resolveSheet(rows, 'pequeno').map((r) => r.quantity)).toEqual([50, 1])
    expect(resolveSheet(rows, null)).toHaveLength(2)
  })
})

describe('materialsToDeduct', () => {
  it('multiplies by the units sold: 2 keychains → 30 g PLA, 2 argolas', () => {
    const out = materialsToDeduct([row('pla', 15, 0.1), row('argola', 1, 0.34)], 2)
    expect(out.map((r) => [r.inventoryItemId, r.total])).toEqual([
      ['pla', 30],
      ['argola', 2],
    ])
  })

  it('handles fractional quantities exactly', () => {
    expect(materialsToDeduct([row('tinta', 0.1, 1)], 3)[0].total).toBe(0.3)
  })
})

describe('marginOnPrice', () => {
  it('is the share of the price left after production cost', () => {
    expect(marginOnPrice(10, 2.04)).toBe(79.6)
    expect(marginOnPrice(0, 1)).toBeNull()
  })
})
