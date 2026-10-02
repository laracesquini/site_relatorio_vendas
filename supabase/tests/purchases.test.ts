import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, n, type TestDb } from './db'
import { createMaterial } from './fixtures'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})

const categoryId = (name: string) => t.id('select id from categories where name = $1', [name])

async function register(p: Record<string, unknown>) {
  return (await t.one<{ id: string }>('select register_purchase($1) as id', [JSON.stringify(p)])).id
}

const item = (id: string) =>
  t.one<{ current_qty: string; avg_cost: string }>('select current_qty, avg_cost from inventory_items where id = $1', [id])

describe('purchases', () => {
  it('registers a purchase of several lines, only some going to stock', async () => {
    const pla = await createMaterial(t, 'PLA')
    const id = await register({
      purchase_date: '2026-09-10',
      notes: 'Pedido loja',
      items: [
        { inventory_item_id: pla, category_id: await categoryId('Filamentos'), quantity: 1, total_amount: 113.9, add_to_stock: true, stock_qty_per_unit: 1000 },
        { description: 'Frete', category_id: await categoryId('Frete e envio'), quantity: 1, total_amount: 15 },
      ],
    })
    const purchase = await t.one<{ total_amount: string }>('select total_amount from purchases where id = $1', [id])
    expect(n(purchase.total_amount)).toBe(128.9)
    const row = await item(pla)
    expect(n(row.current_qty)).toBe(1000)
    expect(n(row.avg_cost)).toBeCloseTo(0.1139, 6)

    const lines = await t.all<{ description: string; stock_quantity: string | null; stock_unit_cost: string | null; purchase_item_count: number; is_operational: boolean }>(
      'select * from purchase_lines where purchase_id = $1 order by total_amount desc', [id])
    expect(lines.map((l) => [l.description, l.stock_quantity && n(l.stock_quantity), l.stock_unit_cost && n(l.stock_unit_cost), l.purchase_item_count, l.is_operational])).toEqual([
      ['PLA', 1000, 0.1139, 2, false],
      ['Frete', null, null, 2, true],
    ])
  })

  it('calculates the unit price', async () => {
    await register({ purchase_date: '2026-09-10', items: [{ description: 'Argolas', quantity: 100, total_amount: 34.11 }] })
    const line = await t.one<{ unit_price: string }>('select unit_price from purchase_lines')
    expect(n(line.unit_price)).toBeCloseTo(0.3411, 6)
  })

  it('editing a purchase corrects stock and the average cost', async () => {
    const pla = await createMaterial(t, 'PLA')
    await register({ purchase_date: '2026-09-01', items: [{ inventory_item_id: pla, quantity: 1, total_amount: 100, add_to_stock: true, stock_qty_per_unit: 1000 }] })
    const second = await register({ purchase_date: '2026-09-05', items: [{ inventory_item_id: pla, quantity: 1, total_amount: 150, add_to_stock: true, stock_qty_per_unit: 1000 }] })
    expect(n((await item(pla)).avg_cost)).toBeCloseTo(0.125, 6)

    // The second spool actually cost R$ 120.
    await t.one('select update_purchase($1, $2)', [second, JSON.stringify({
      purchase_date: '2026-09-05',
      items: [{ inventory_item_id: pla, quantity: 1, total_amount: 120, add_to_stock: true, stock_qty_per_unit: 1000 }],
    })])
    const row = await item(pla)
    expect(n(row.current_qty)).toBe(2000)
    expect(n(row.avg_cost)).toBeCloseTo(0.11, 6)
    expect(await t.all('select * from purchase_lines where purchase_id = $1', [second])).toHaveLength(1)
  })

  it('an expense can be edited into a stock purchase and back', async () => {
    const rings = await createMaterial(t, 'Argolas', 'un')
    const id = await register({ purchase_date: '2026-09-01', items: [{ description: 'Argolas', quantity: 100, total_amount: 34 }] })
    expect(n((await item(rings)).current_qty)).toBe(0)
    await t.one('select update_purchase($1, $2)', [id, JSON.stringify({
      purchase_date: '2026-09-01',
      items: [{ inventory_item_id: rings, quantity: 100, total_amount: 34, add_to_stock: true }],
    })])
    expect(n((await item(rings)).current_qty)).toBe(100)
    await t.one('select update_purchase($1, $2)', [id, JSON.stringify({
      purchase_date: '2026-09-01',
      items: [{ description: 'Argolas', quantity: 100, total_amount: 34 }],
    })])
    expect(n((await item(rings)).current_qty)).toBe(0)
  })

  it('rejects invalid purchases without saving anything', async () => {
    const pla = await createMaterial(t, 'PLA')
    await expect(register({ purchase_date: '2026-09-01', items: [] })).rejects.toThrow(/pelo menos um item/)
    await expect(register({ purchase_date: '2026-09-01', items: [{ description: 'X', quantity: 0, total_amount: 1 }] })).rejects.toThrow(/quantidade/)
    await expect(register({ purchase_date: '2026-09-01', items: [{ description: 'X', quantity: 1, total_amount: -1 }] })).rejects.toThrow(/negativo/)
    await expect(register({ items: [{ description: 'X', quantity: 1, total_amount: 1 }] })).rejects.toThrow(/data/)
    await expect(register({
      purchase_date: '2026-09-01',
      items: [
        { inventory_item_id: pla, quantity: 1, total_amount: 100, add_to_stock: true, stock_qty_per_unit: 1000 },
        { description: 'X', quantity: 1, total_amount: -5 },
      ],
    })).rejects.toThrow()
    expect(await t.all('select * from purchases')).toHaveLength(0)
    expect(n((await item(pla)).current_qty)).toBe(0)
  })
})
