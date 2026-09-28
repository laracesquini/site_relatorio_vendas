import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, n, type TestDb } from './db'
import { buy, createMaterial, createProduct } from './fixtures'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})

const item = (id: string) =>
  t.one<{ current_qty: string; avg_cost: string }>(
    'select current_qty, avg_cost from inventory_items where id = $1',
    [id],
  )

describe('weighted average cost', () => {
  it('averages two purchases: 1 kg for R$ 100 and 1 kg for R$ 120 → R$ 0,11/g', async () => {
    const pla = await createMaterial(t, 'PLA Preto')
    await buy(t, pla, 1, 100, 1000)
    await buy(t, pla, 1, 120, 1000)
    const row = await item(pla)
    expect(n(row.current_qty)).toBe(2000)
    expect(n(row.avg_cost)).toBeCloseTo(0.11, 6)
  })

  it('keeps the unit cost of each movement as history', async () => {
    const pla = await createMaterial(t, 'PLA Preto')
    await buy(t, pla, 1, 100, 1000)
    await buy(t, pla, 1, 120, 1000)
    const costs = await t.all<{ unit_cost: string }>(
      'select unit_cost from stock_movements where inventory_item_id = $1 order by created_at, balance_after',
      [pla],
    )
    expect(costs.map((c) => n(c.unit_cost))).toEqual([0.1, 0.12])
  })

  it('does not change the average on OUT or ADJUSTMENT', async () => {
    const rings = await createMaterial(t, 'Argola', 'un')
    await buy(t, rings, 100, 34.11)
    await t.one(`select register_stock_movement('OUT', 3, $1)`, [rings])
    await t.one(`select register_stock_movement('ADJUSTMENT', -2, $1)`, [rings])
    const row = await item(rings)
    expect(n(row.current_qty)).toBe(95)
    expect(n(row.avg_cost)).toBeCloseTo(0.3411, 6)
  })

  it('an IN without a cost keeps the current average', async () => {
    const rings = await createMaterial(t, 'Argola', 'un')
    await buy(t, rings, 100, 34.11)
    await t.one(`select register_stock_movement('IN', 50, $1)`, [rings])
    expect(n((await item(rings)).avg_cost)).toBeCloseTo(0.3411, 6)
  })

  it('restarts the average from the incoming cost when stock is zero or negative', async () => {
    const rings = await createMaterial(t, 'Argola', 'un')
    await t.one(`select register_stock_movement('OUT', 5, $1)`, [rings])
    await buy(t, rings, 10, 5)
    const row = await item(rings)
    expect(n(row.current_qty)).toBe(5)
    expect(n(row.avg_cost)).toBeCloseTo(0.5, 6)
  })

  it('removes a deleted purchase from the average', async () => {
    const pla = await createMaterial(t, 'PLA Preto')
    await buy(t, pla, 1, 100, 1000)
    const second = await buy(t, pla, 1, 120, 1000)
    await t.one('select delete_purchase($1)', [second])
    const row = await item(pla)
    expect(n(row.current_qty)).toBe(1000)
    expect(n(row.avg_cost)).toBeCloseTo(0.1, 6)
  })
})

describe('stock integrity', () => {
  it('rejects direct edits to the cached quantity', async () => {
    const rings = await createMaterial(t, 'Argola', 'un')
    await expect(
      t.db.query('update inventory_items set current_qty = 10 where id = $1', [rings]),
    ).rejects.toThrow(/movimentações/)
  })

  it('ignores a quantity sent when creating an item', async () => {
    const unit = await t.id(`select id from units where code = 'un'`)
    const id = await t.id(
      `insert into inventory_items (name, unit_id, current_qty, avg_cost) values ('X', $1, 99, 5) returning id`,
      [unit],
    )
    expect(n((await item(id)).current_qty)).toBe(0)
  })

  it('makes movements immutable', async () => {
    const rings = await createMaterial(t, 'Argola', 'un')
    await buy(t, rings, 10, 5)
    await expect(t.db.query('delete from stock_movements')).rejects.toThrow(/estorno/)
  })

  it('records the balance after each movement', async () => {
    const rings = await createMaterial(t, 'Argola', 'un')
    await buy(t, rings, 100, 34.11)
    await t.one(`select register_stock_movement('OUT', 3, $1)`, [rings])
    const rows = await t.all<{ balance_after: string }>(
      'select balance_after from stock_movements where inventory_item_id = $1 order by created_at, balance_after desc',
      [rings],
    )
    expect(rows.map((r) => n(r.balance_after))).toEqual([100, 97])
  })
})

describe('production of stocked products', () => {
  it('consumes materials and adds finished units at the real cost', async () => {
    const pla = await createMaterial(t, 'PLA')
    const rings = await createMaterial(t, 'Argola', 'un')
    await buy(t, pla, 1, 100, 1000) // R$ 0,10/g
    await buy(t, rings, 100, 34) // R$ 0,34/un
    const { productId, variantId } = await createProduct(t, 'Fidget Estrela', {
      sku: 'FID-EST',
      stockMode: 'stocked',
    })
    await t.db.query(
      `insert into product_materials (product_id, inventory_item_id, quantity) values ($1, $2, 15), ($1, $3, 1)`,
      [productId, pla, rings],
    )

    await t.one('select register_production($1, 4)', [variantId])

    expect(n((await item(pla)).current_qty)).toBe(940)
    expect(n((await item(rings)).current_qty)).toBe(96)
    const variant = await t.one<{ current_qty: string; avg_cost: string }>(
      'select current_qty, avg_cost from product_variants where id = $1',
      [variantId],
    )
    expect(n(variant.current_qty)).toBe(4)
    expect(n(variant.avg_cost)).toBeCloseTo(1.84, 6)
  })

  it('refuses production for made-to-order products', async () => {
    const { variantId } = await createProduct(t, 'Chaveiro Nome', { sku: 'CH-NOME' })
    await expect(t.db.query('select register_production($1, 1)', [variantId])).rejects.toThrow(
      /estoque pronto/,
    )
  })
})
