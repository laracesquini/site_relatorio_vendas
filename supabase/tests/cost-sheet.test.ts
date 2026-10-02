import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, n, type TestDb } from './db'
import { buy, channelId, createMaterial, createProduct, sell } from './fixtures'

let t: TestDb
let pla: string
let ring: string
let pack: string
beforeEach(async () => {
  t = await createTestDb()
  pla = await createMaterial(t, 'PLA')
  ring = await createMaterial(t, 'Argola', 'un')
  pack = await createMaterial(t, 'Embalagem', 'un')
  await buy(t, pla, 1, 100, 1000) // R$ 0,10/g
  await buy(t, ring, 100, 34) // R$ 0,34
  await buy(t, pack, 10, 2) // R$ 0,20
})

const saveSheet = (productId: string, p: Record<string, unknown>) =>
  t.one('select save_cost_sheet($1, $2)', [productId, JSON.stringify(p)])

const cost = async (variantId: string) =>
  t.one<{ unit_cost: string; material_cost: string; extra_cost: string; cost_source: string }>(
    'select unit_cost, material_cost, extra_cost, cost_source from variant_costs where variant_id = $1',
    [variantId],
  )

describe('save_cost_sheet', () => {
  it('prices the keychain from its materials: 15 g PLA + argola + embalagem = R$ 2,04', async () => {
    const { productId, variantId } = await createProduct(t, 'Chaveiro Personalizado', { sku: 'CH', estimatedCost: 9 })
    await saveSheet(productId, {
      materials: [
        { inventory_item_id: pla, quantity: 15 },
        { inventory_item_id: ring, quantity: 1 },
        { inventory_item_id: pack, quantity: 1 },
      ],
    })
    const c = await cost(variantId)
    expect(n(c.unit_cost)).toBeCloseTo(2.04, 6)
    expect(c.cost_source).toBe('sheet')
  })

  it('adds extra costs per unit (energia, mão de obra)', async () => {
    const { productId, variantId } = await createProduct(t, 'Chaveiro', { sku: 'CH' })
    await saveSheet(productId, {
      materials: [{ inventory_item_id: pla, quantity: 15 }],
      extra_costs: [
        { label: 'Energia', amount: 0.12 },
        { label: 'Mão de obra', amount: 1 },
      ],
    })
    const c = await cost(variantId)
    expect([n(c.material_cost), n(c.extra_cost), n(c.unit_cost)]).toEqual([1.5, 1.12, 2.62])
  })

  it('follows the current average cost of the materials', async () => {
    const { productId, variantId } = await createProduct(t, 'Chaveiro', { sku: 'CH' })
    await saveSheet(productId, { materials: [{ inventory_item_id: pla, quantity: 15 }] })
    await buy(t, pla, 1, 140, 1000) // average becomes R$ 0,12/g
    expect(n((await cost(variantId)).unit_cost)).toBeCloseTo(1.8, 6)
  })

  it('lets a variant have its own materials, keeping the product extras', async () => {
    const { productId, variantId } = await createProduct(t, 'Vaso', { sku: 'VASO' })
    const big = await t.id(`insert into product_variants (product_id, sku) values ($1, 'VASO-G') returning id`, [productId])
    await saveSheet(productId, {
      materials: [
        { inventory_item_id: pla, quantity: 50 },
        { inventory_item_id: pla, quantity: 120, variant_id: big },
      ],
      extra_costs: [{ label: 'Energia', amount: 0.5 }],
    })
    expect(n((await cost(variantId)).unit_cost)).toBeCloseTo(5.5, 6)
    expect(n((await cost(big)).unit_cost)).toBeCloseTo(12.5, 6)
  })

  it('replaces the previous sheet entirely', async () => {
    const { productId, variantId } = await createProduct(t, 'Chaveiro', { sku: 'CH', estimatedCost: 3 })
    await saveSheet(productId, { materials: [{ inventory_item_id: pla, quantity: 15 }], extra_costs: [{ label: 'Energia', amount: 1 }] })
    await saveSheet(productId, { materials: [], extra_costs: [] })
    const c = await cost(variantId)
    expect(c.cost_source).toBe('estimate')
    expect(n(c.unit_cost)).toBe(3)
  })

  it('does not change the cost of past sales', async () => {
    const { productId, variantId } = await createProduct(t, 'Chaveiro', { sku: 'CH', estimatedCost: 5 })
    const saleId = await sell(t, await channelId(t, 'Shopee'), 20, [{ variant_id: variantId, quantity: 1, gross_amount: 25 }])
    await saveSheet(productId, { materials: [{ inventory_item_id: pla, quantity: 15 }] })
    const line = await t.one<{ unit_cost: string }>('select unit_cost from sale_items where sale_id = $1', [saleId])
    expect(n(line.unit_cost)).toBe(5)
  })

  it('rejects invalid sheets without changing the saved one', async () => {
    const { productId, variantId } = await createProduct(t, 'Chaveiro', { sku: 'CH' })
    await saveSheet(productId, { materials: [{ inventory_item_id: pla, quantity: 15 }] })
    await expect(saveSheet(productId, { materials: [{ inventory_item_id: pla, quantity: 0 }] })).rejects.toThrow(/maior que zero/)
    await expect(
      saveSheet(productId, { materials: [{ inventory_item_id: pla, quantity: 1 }, { inventory_item_id: pla, quantity: 2 }] }),
    ).rejects.toThrow(/duas vezes/)
    await expect(saveSheet(productId, { extra_costs: [{ label: ' ', amount: 1 }] })).rejects.toThrow(/nome/)
    await expect(saveSheet(productId, { extra_costs: [{ label: 'Energia', amount: -1 }] })).rejects.toThrow(/negativos/)
    expect(n((await cost(variantId)).unit_cost)).toBeCloseTo(1.5, 6)
  })

  it('refuses a variant of another product', async () => {
    const a = await createProduct(t, 'A', { sku: 'A' })
    const b = await createProduct(t, 'B', { sku: 'B' })
    await expect(
      saveSheet(a.productId, { materials: [{ inventory_item_id: pla, quantity: 1, variant_id: b.variantId }] }),
    ).rejects.toThrow()
  })
})
