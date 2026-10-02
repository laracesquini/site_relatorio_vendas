import { describe, expect, it } from 'vitest'
import type { PurchaseLine } from './api'
import { fromPurchaseLines, purchaseFormSchema, toPurchasePayload, type PurchaseFormValues } from './schema'

const line = {
  inventory_item_id: 'pla',
  description: '',
  category_id: 'filamentos',
  quantity: 1,
  total_amount: 113.9,
  add_to_stock: true,
  stock_qty_per_unit: 1000,
}
const valid: PurchaseFormValues = { purchase_date: '2026-09-10', supplier_id: null, notes: '', items: [line] }
const paths = (v: unknown) => purchaseFormSchema.safeParse(v).error?.issues.map((i) => i.path.join('.')) ?? []

describe('purchaseFormSchema', () => {
  it('accepts a stock purchase and a plain expense', () => {
    expect(paths(valid)).toEqual([])
    expect(
      paths({ ...valid, items: [{ ...line, inventory_item_id: null, description: 'Anúncio Shopee', add_to_stock: false }] }),
    ).toEqual([])
  })

  it('requires a description when no material is chosen', () => {
    expect(paths({ ...valid, items: [{ ...line, inventory_item_id: null, description: ' ' }] })).toEqual([
      'items.0.description',
    ])
  })

  it('rejects zero quantity, negative totals and an empty purchase', () => {
    expect(paths({ ...valid, items: [{ ...line, quantity: 0, total_amount: -1 }] })).toEqual([
      'items.0.quantity',
      'items.0.total_amount',
    ])
    expect(paths({ ...valid, items: [] })).toEqual(['items'])
  })
})

describe('toPurchasePayload', () => {
  it('sends the conversion only for lines that go to stock', () => {
    const payload = toPurchasePayload({
      ...valid,
      items: [line, { ...line, inventory_item_id: null, description: 'Frete', add_to_stock: true, stock_qty_per_unit: 5 }],
    })
    expect(payload.items[0]).toMatchObject({ add_to_stock: true, stock_qty_per_unit: 1000, description: null })
    expect(payload.items[1]).toMatchObject({ add_to_stock: false, stock_qty_per_unit: 1, description: 'Frete' })
  })

  it('defaults the conversion to 1 stock unit per purchased unit', () => {
    expect(toPurchasePayload({ ...valid, items: [{ ...line, stock_qty_per_unit: null }] }).items[0].stock_qty_per_unit).toBe(1)
  })
})

describe('fromPurchaseLines', () => {
  it('rebuilds the form from saved lines', () => {
    const saved = [
      {
        purchase_date: '2026-09-10',
        supplier_id: 's',
        purchase_notes: 'Pedido',
        inventory_item_id: 'pla',
        inventory_item_name: 'PLA',
        description: 'PLA',
        category_id: 'c',
        quantity: 1,
        total_amount: 113.9,
        add_to_stock: true,
        stock_qty_per_unit: 1000,
      },
    ] as PurchaseLine[]
    expect(fromPurchaseLines(saved)).toEqual({
      purchase_date: '2026-09-10',
      supplier_id: 's',
      notes: 'Pedido',
      items: [
        {
          inventory_item_id: 'pla',
          description: '',
          category_id: 'c',
          quantity: 1,
          total_amount: 113.9,
          add_to_stock: true,
          stock_qty_per_unit: 1000,
        },
      ],
    })
  })
})
