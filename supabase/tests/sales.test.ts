import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, n, type TestDb } from './db'
import { buy, channelId, createMaterial, createProduct, sell } from './fixtures'

let t: TestDb
let ml: string
beforeEach(async () => {
  t = await createTestDb()
  ml = await channelId(t, 'Mercado Livre')
})

type Line = Record<
  | 'gross_amount'
  | 'received_amount'
  | 'fees'
  | 'unit_cost'
  | 'total_cost'
  | 'profit'
  | 'margin'
  | 'product_name',
  string
>
const lines = (saleId: string) =>
  t.all<Line>('select * from sale_lines where sale_id = $1 order by gross_amount', [saleId])

const qty = async (id: string) =>
  n(
    (await t.one<{ current_qty: string }>('select current_qty from inventory_items where id = $1', [id]))
      .current_qty,
  )

describe('create_sale', () => {
  it('calculates fees, cost, profit and margin (R$ 30,00 → R$ 19,40, cost R$ 10,90)', async () => {
    const { variantId } = await createProduct(t, 'Luminária Lua', { sku: 'LUM-LUA', estimatedCost: 10.9 })
    const saleId = await sell(t, ml, 19.4, [{ variant_id: variantId, quantity: 1, gross_amount: 30 }])
    const [line] = await lines(saleId)
    expect(n(line.fees)).toBe(10.6)
    expect(n(line.total_cost)).toBe(10.9)
    expect(n(line.profit)).toBe(8.5)
    expect(n(line.margin)).toBe(43.81)

    const sale = await t.one<Line>('select * from sales where id = $1', [saleId])
    expect([n(sale.gross_amount), n(sale.received_amount), n(sale.fees), n(sale.profit)]).toEqual([
      30, 19.4, 10.6, 8.5,
    ])
  })

  it('multiplies the unit cost by the quantity', async () => {
    const { variantId } = await createProduct(t, 'Chaveiro', { sku: 'CH', estimatedCost: 2.04 })
    const saleId = await sell(t, ml, 20, [{ variant_id: variantId, quantity: 3, gross_amount: 24 }])
    const [line] = await lines(saleId)
    expect(n(line.total_cost)).toBe(6.12)
    expect(n(line.profit)).toBe(13.88)
  })

  it('freezes the cost: changing the product later does not alter the sale', async () => {
    const { productId, variantId } = await createProduct(t, 'Vaso', { sku: 'VASO', estimatedCost: 10 })
    const saleId = await sell(t, ml, 25, [{ variant_id: variantId, quantity: 1, gross_amount: 30 }])
    await t.db.query(`update products set estimated_cost = 12, name = 'Vaso Novo' where id = $1`, [
      productId,
    ])
    const [line] = await lines(saleId)
    expect(n(line.unit_cost)).toBe(10)
    expect(n(line.profit)).toBe(15)
    expect(line.product_name).toBe('Vaso')
  })

  it('uses the cost sheet at current average material cost (R$ 2,04 keychain)', async () => {
    const pla = await createMaterial(t, 'PLA')
    const ring = await createMaterial(t, 'Argola', 'un')
    const pack = await createMaterial(t, 'Embalagem', 'un')
    await buy(t, pla, 1, 100, 1000)
    await buy(t, ring, 100, 34)
    await buy(t, pack, 10, 2)
    const { productId, variantId } = await createProduct(t, 'Chaveiro Personalizado', { sku: 'CH-P' })
    await t.db.query(
      `insert into product_materials (product_id, inventory_item_id, quantity)
       values ($1, $2, 15), ($1, $3, 1), ($1, $4, 1)`,
      [productId, pla, ring, pack],
    )
    const cost = await t.one<{ unit_cost: string; cost_source: string }>(
      'select unit_cost, cost_source from variant_costs where variant_id = $1',
      [variantId],
    )
    expect(n(cost.unit_cost)).toBeCloseTo(2.04, 6)
    expect(cost.cost_source).toBe('sheet')
  })

  it('accepts a cost typed for this sale', async () => {
    const { variantId } = await createProduct(t, 'Kit', { sku: 'KIT', estimatedCost: 5 })
    const saleId = await sell(t, ml, 40, [
      { variant_id: variantId, quantity: 1, gross_amount: 50, unit_cost: 7.5 },
    ])
    expect(n((await lines(saleId))[0].total_cost)).toBe(7.5)
  })

  it('splits the amount received across items by gross amount, exactly', async () => {
    const a = await createProduct(t, 'A', { sku: 'A' })
    const b = await createProduct(t, 'B', { sku: 'B' })
    const c = await createProduct(t, 'C', { sku: 'C' })
    const saleId = await sell(t, ml, 10, [
      { variant_id: a.variantId, quantity: 1, gross_amount: 10 },
      { variant_id: b.variantId, quantity: 1, gross_amount: 10 },
      { variant_id: c.variantId, quantity: 1, gross_amount: 10 },
    ])
    const received = (await lines(saleId)).map((r) => n(r.received_amount))
    expect(received.reduce((s, v) => s + v, 0)).toBeCloseTo(10, 2)
    expect([...received].sort()).toEqual([3.33, 3.33, 3.34])
  })

  it('rejects received greater than gross, negatives and invalid quantities', async () => {
    const { variantId } = await createProduct(t, 'A', { sku: 'A' })
    await expect(
      sell(t, ml, 31, [{ variant_id: variantId, quantity: 1, gross_amount: 30 }]),
    ).rejects.toThrow(/maior que o preço bruto/)
    await expect(
      sell(t, ml, 0, [{ variant_id: variantId, quantity: 1, gross_amount: -1 }]),
    ).rejects.toThrow(/negativo/)
    await expect(
      sell(t, ml, 0, [{ variant_id: variantId, quantity: 0, gross_amount: 0 }]),
    ).rejects.toThrow(/quantidade/)
    await expect(
      sell(t, ml, 0, [{ variant_id: variantId, quantity: 1.5, gross_amount: 0 }]),
    ).rejects.toThrow(/inteiro/)
    expect(await t.all('select * from sales')).toHaveLength(0)
  })

  it('allows a loss (negative profit)', async () => {
    const { variantId } = await createProduct(t, 'A', { sku: 'A', estimatedCost: 20 })
    const saleId = await sell(t, ml, 15, [{ variant_id: variantId, quantity: 1, gross_amount: 20 }])
    expect(n((await lines(saleId))[0].profit)).toBe(-5)
  })
})

describe('stock deduction on sale', () => {
  async function keychain(autoDeduct: boolean) {
    const pla = await createMaterial(t, 'PLA')
    const ring = await createMaterial(t, 'Argola', 'un')
    await buy(t, pla, 1, 100, 1000)
    await buy(t, ring, 100, 34)
    const p = await createProduct(t, 'Chaveiro', { sku: 'CH', autoDeduct })
    await t.db.query(
      `insert into product_materials (product_id, inventory_item_id, quantity) values ($1, $2, 15), ($1, $3, 1)`,
      [p.productId, pla, ring],
    )
    return { ...p, pla, ring }
  }

  it('deducts materials when the option is on: 2 keychains → -30 g PLA, -2 rings', async () => {
    const k = await keychain(true)
    await sell(t, ml, 20, [{ variant_id: k.variantId, quantity: 2, gross_amount: 30 }])
    expect(await qty(k.pla)).toBe(970)
    expect(await qty(k.ring)).toBe(98)
  })

  it('does not touch stock when the option is off', async () => {
    const k = await keychain(false)
    await sell(t, ml, 20, [{ variant_id: k.variantId, quantity: 2, gross_amount: 30 }])
    expect(await qty(k.pla)).toBe(1000)
  })

  it('uses a variant-specific sheet instead of the product sheet', async () => {
    const k = await keychain(true)
    const big = await t.id(
      `insert into product_variants (product_id, sku) values ($1, 'CH-G') returning id`,
      [k.productId],
    )
    await t.db.query(
      `insert into product_materials (product_id, variant_id, inventory_item_id, quantity) values ($1, $2, $3, 40)`,
      [k.productId, big, k.pla],
    )
    await sell(t, ml, 20, [{ variant_id: big, quantity: 1, gross_amount: 30 }])
    expect(await qty(k.pla)).toBe(960)
    expect(await qty(k.ring)).toBe(100)
  })

  it('deducts finished units for stocked products, not materials', async () => {
    const pla = await createMaterial(t, 'PLA')
    await buy(t, pla, 1, 100, 1000)
    const p = await createProduct(t, 'Fidget', { sku: 'FID', stockMode: 'stocked', autoDeduct: true })
    await t.db.query(
      `insert into product_materials (product_id, inventory_item_id, quantity) values ($1, $2, 20)`,
      [p.productId, pla],
    )
    await t.one('select register_production($1, 5)', [p.variantId])
    await sell(t, ml, 20, [{ variant_id: p.variantId, quantity: 2, gross_amount: 30 }])
    expect(await qty(pla)).toBe(900)
    const v = await t.one<{ current_qty: string }>(
      'select current_qty from product_variants where id = $1',
      [p.variantId],
    )
    expect(n(v.current_qty)).toBe(3)
  })

  it('rolls back everything when any part fails', async () => {
    const k = await keychain(true)
    await expect(
      sell(t, ml, 20, [
        { variant_id: k.variantId, quantity: 2, gross_amount: 30 },
        { variant_id: '00000000-0000-0000-0000-000000000000', quantity: 1, gross_amount: 5 },
      ]),
    ).rejects.toThrow()
    expect(await t.all('select * from sales')).toHaveLength(0)
    expect(await qty(k.pla)).toBe(1000)
  })

  it('restores stock when a sale is deleted, keeping the sale record', async () => {
    const k = await keychain(true)
    const saleId = await sell(t, ml, 20, [{ variant_id: k.variantId, quantity: 2, gross_amount: 30 }])
    await t.one('select delete_sale($1)', [saleId])
    expect(await qty(k.pla)).toBe(1000)
    expect(await t.all('select * from sale_lines')).toHaveLength(0)
    expect(
      await t.all('select * from sales where id = $1 and deleted_at is not null', [saleId]),
    ).toHaveLength(1)
    await expect(t.db.query('select delete_sale($1)', [saleId])).rejects.toThrow(/não encontrada/)
  })

  it('re-applies stock and keeps the frozen cost when a sale is edited', async () => {
    const k = await keychain(true)
    const saleId = await sell(t, ml, 20, [{ variant_id: k.variantId, quantity: 2, gross_amount: 30 }])
    const [before] = await lines(saleId)
    await buy(t, k.pla, 1, 200, 1000) // material gets more expensive
    const edit = {
      sale_date: '2026-09-10',
      channel_id: ml,
      received_amount: 30,
      items: [{ variant_id: k.variantId, quantity: 3, gross_amount: 45, unit_cost: n(before.unit_cost) }],
    }
    await t.one('select update_sale($1, $2)', [saleId, JSON.stringify(edit)])
    expect(await qty(k.pla)).toBe(2000 - 45)
    const after = await lines(saleId)
    expect(after).toHaveLength(1)
    expect(n(after[0].unit_cost)).toBe(n(before.unit_cost))
  })
})
