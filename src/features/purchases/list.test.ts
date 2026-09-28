import { describe, expect, it } from 'vitest'
import type { PurchaseLine } from './api'
import { searchPurchaseLines, sumPurchases } from './list'

const line = (over: Partial<PurchaseLine>) =>
  ({
    purchase_id: 'p1',
    description: 'Argolas',
    inventory_item_name: null,
    category_name: null,
    supplier_name: null,
    purchase_notes: null,
    total_amount: 0,
    add_to_stock: false,
    is_operational: false,
    ...over,
  }) as PurchaseLine

describe('sumPurchases', () => {
  it('splits spending into stock, operational and other', () => {
    const t = sumPurchases([
      line({ total_amount: 113.9, add_to_stock: true }),
      line({ total_amount: 34.11, add_to_stock: true }),
      line({ purchase_id: 'p2', total_amount: 25, is_operational: true }),
      line({ purchase_id: 'p3', total_amount: 10.1 }),
    ])
    expect(t).toEqual({ total: 183.11, toStock: 148.01, operational: 25, other: 10.1, purchases: 3 })
  })
})

describe('searchPurchaseLines', () => {
  it('finds by description, material, category or supplier, ignoring accents', () => {
    const lines = [
      line({ description: 'PLA', inventory_item_name: 'PLA Preto', supplier_name: 'Loja Três D' }),
      line({ description: 'Anúncio', category_name: 'Anúncios' }),
    ]
    expect(searchPurchaseLines(lines, 'tres d')).toHaveLength(1)
    expect(searchPurchaseLines(lines, 'anuncio')).toHaveLength(1)
    expect(searchPurchaseLines(lines, 'preto')).toHaveLength(1)
    expect(searchPurchaseLines(lines, '')).toHaveLength(2)
  })
})
