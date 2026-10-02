import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, n, type TestDb } from './db'
import { channelId, createProduct, sell, unitId } from './fixtures'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})

async function saveItem(p: Record<string, unknown>) {
  return (await t.one<{ id: string }>('select save_inventory_item($1) as id', [JSON.stringify(p)])).id
}

const item = (id: string) =>
  t.one<{ current_qty: string; avg_cost: string; min_qty: string; name: string }>(
    'select name, current_qty, avg_cost, min_qty from inventory_items where id = $1',
    [id],
  )

describe('save_inventory_item', () => {
  it('creates an item with its opening stock and cost in one step', async () => {
    const id = await saveItem({
      name: 'Argolas',
      unit_id: await unitId(t, 'un'),
      min_qty: 20,
      initial_qty: 100,
      initial_unit_cost: 0.3411,
    })
    const row = await item(id)
    expect([n(row.current_qty), n(row.avg_cost), n(row.min_qty)]).toEqual([100, 0.3411, 20])
    const [m] = await t.all<{ notes: string; movement_type: string }>(
      'select notes, movement_type from stock_movements where inventory_item_id = $1', [id])
    expect(m).toEqual({ notes: 'Estoque inicial', movement_type: 'IN' })
  })

  it('creates an item without opening stock', async () => {
    const id = await saveItem({ name: 'PETG', unit_id: await unitId(t, 'g') })
    expect(n((await item(id)).current_qty)).toBe(0)
    expect(await t.all('select * from stock_movements')).toHaveLength(0)
  })

  it('updates details but never the balance', async () => {
    const unit = await unitId(t, 'un')
    const id = await saveItem({ name: 'Argola', unit_id: unit, initial_qty: 10, initial_unit_cost: 0.3 })
    await saveItem({ id, name: 'Argola de chaveiro', unit_id: unit, min_qty: 5, initial_qty: 999 })
    const row = await item(id)
    expect(row.name).toBe('Argola de chaveiro')
    expect(n(row.current_qty)).toBe(10)
  })

  it('refuses to change the unit once the item has movements', async () => {
    const id = await saveItem({ name: 'PLA', unit_id: await unitId(t, 'g'), initial_qty: 1000, initial_unit_cost: 0.1 })
    await expect(saveItem({ id, name: 'PLA', unit_id: await unitId(t, 'kg') })).rejects.toThrow(/unidade não pode/)
  })

  it('validates required fields and negatives', async () => {
    await expect(saveItem({ name: ' ', unit_id: await unitId(t, 'un') })).rejects.toThrow(/nome/)
    await expect(saveItem({ name: 'X' })).rejects.toThrow(/unidade/)
    await expect(saveItem({ name: 'X', unit_id: await unitId(t, 'un'), min_qty: -1 })).rejects.toThrow(/negativo/)
  })
})

describe('adjust_stock_to', () => {
  it('records the difference to the counted quantity', async () => {
    const id = await saveItem({ name: 'Argolas', unit_id: await unitId(t, 'un'), initial_qty: 100, initial_unit_cost: 0.34 })
    await t.one('select adjust_stock_to(87, $1)', [id])
    const row = await item(id)
    expect(n(row.current_qty)).toBe(87)
    expect(n(row.avg_cost)).toBeCloseTo(0.34, 6) // a count does not change the average
    const adj = await t.one<{ quantity: string; notes: string }>(
      `select quantity, notes from stock_movements where movement_type = 'ADJUSTMENT'`)
    expect([n(adj.quantity), adj.notes]).toEqual([-13, 'Ajuste de inventário'])
  })

  it('does nothing when the count matches', async () => {
    const id = await saveItem({ name: 'Argolas', unit_id: await unitId(t, 'un'), initial_qty: 10, initial_unit_cost: 0.34 })
    const r = await t.one<{ r: unknown }>('select adjust_stock_to(10, $1) as r', [id])
    expect(r.r).toBeNull()
    expect(await t.all(`select * from stock_movements where movement_type = 'ADJUSTMENT'`)).toHaveLength(0)
  })

  it('adjusts finished products too, and rejects negative counts', async () => {
    const { variantId } = await createProduct(t, 'Fidget', { sku: 'FID', stockMode: 'stocked' })
    await t.one('select adjust_stock_to(4, null, $1)', [variantId])
    const v = await t.one<{ current_qty: string }>('select current_qty from product_variants where id = $1', [variantId])
    expect(n(v.current_qty)).toBe(4)
    await expect(t.db.query('select adjust_stock_to(-1, null, $1)', [variantId])).rejects.toThrow(/contada/)
  })
})

describe('stock_movement_history', () => {
  it('describes each movement with its item, unit and origin', async () => {
    const pla = await saveItem({ name: 'PLA', unit_id: await unitId(t, 'g'), initial_qty: 1000, initial_unit_cost: 0.1 })
    const p = await createProduct(t, 'Chaveiro', { sku: 'CH', autoDeduct: true })
    await t.db.query(`insert into product_materials (product_id, inventory_item_id, quantity) values ($1, $2, 15)`, [
      p.productId,
      pla,
    ])
    await sell(t, await channelId(t, 'Shopee'), 20, [{ variant_id: p.variantId, quantity: 2, gross_amount: 30 }])

    const rows = await t.all<{
      kind: string
      item_name: string
      unit: string
      movement_type: string
      quantity: string
      balance_after: string
      sale_product_name: string | null
    }>('select * from stock_movement_history order by created_at, balance_after desc')
    expect(rows.map((r) => [r.kind, r.item_name, r.unit, r.movement_type, n(r.quantity), n(r.balance_after), r.sale_product_name])).toEqual([
      ['material', 'PLA', 'g', 'IN', 1000, 1000, null],
      ['material', 'PLA', 'g', 'OUT', -30, 970, 'Chaveiro'],
    ])
  })
})
