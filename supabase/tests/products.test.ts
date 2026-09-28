import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, n, type TestDb } from './db'
import { channelId, sell } from './fixtures'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})

async function value(type: string, v: string) {
  const typeId = await t.id('select id from variation_types where name = $1', [type])
  return t.id(
    `insert into variation_values (variation_type_id, value) values ($1, $2)
     on conflict (variation_type_id, lower(value)) do update set value = excluded.value
     returning id`,
    [typeId, v],
  )
}

async function save(p: Record<string, unknown>) {
  return (await t.one<{ id: string }>('select save_product($1) as id', [JSON.stringify(p)])).id
}

const variants = (productId: string) =>
  t.all<{ id: string; sku: string; is_default: boolean; archived_at: string | null }>(
    'select id, sku, is_default, archived_at from product_variants where product_id = $1 order by sku',
    [productId],
  )

const base = { name: 'Plaquinha Pet', sku: 'PET', default_price: 25, estimated_cost: 6 }

describe('save_product', () => {
  it('creates a hidden default variant when there are no variations', async () => {
    const id = await save({ ...base, variants: [] })
    const rows = await variants(id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ sku: 'PET', is_default: true })
  })

  it('keeps the default variant SKU in sync with the product', async () => {
    const id = await save({ ...base, variants: [] })
    await save({ ...base, id, sku: 'PET-2', variants: [] })
    expect((await variants(id))[0].sku).toBe('PET-2')
  })

  it('creates variants with their values and label', async () => {
    const azul = await value('Cor', 'Azul')
    const rosa = await value('Cor', 'Rosa')
    const pequeno = await value('Tamanho', 'Pequeno')
    const id = await save({
      ...base,
      variants: [
        { sku: 'PET-AZ-P', value_ids: [azul, pequeno], price: 27 },
        { sku: 'PET-RS-P', value_ids: [rosa, pequeno] },
      ],
    })
    const rows = await variants(id)
    expect(rows.map((r) => r.sku)).toEqual(['PET-AZ-P', 'PET-RS-P'])
    const label = await t.one<{ label: string }>(
      `select private.variant_label(id) as label from product_variants where sku = 'PET-AZ-P'`,
    )
    expect(label.label).toBe('Azul / Pequeno')
  })

  it('removes the default variant when variations are added', async () => {
    const azul = await value('Cor', 'Azul')
    const id = await save({ ...base, variants: [] })
    await save({ ...base, id, variants: [{ sku: 'PET-AZ', value_ids: [azul] }] })
    expect((await variants(id)).map((r) => r.sku)).toEqual(['PET-AZ'])
  })

  it('archives, instead of deleting, a removed variant that has sales', async () => {
    const azul = await value('Cor', 'Azul')
    const rosa = await value('Cor', 'Rosa')
    const id = await save({
      ...base,
      variants: [
        { sku: 'PET-AZ', value_ids: [azul] },
        { sku: 'PET-RS', value_ids: [rosa] },
      ],
    })
    const [az, rs] = await variants(id)
    await sell(t, await channelId(t, 'Shopee'), 20, [{ variant_id: az.id, quantity: 1, gross_amount: 25 }])
    await save({ ...base, id, variants: [] })
    const rows = await variants(id)
    expect(rows.find((r) => r.id === az.id)?.archived_at).not.toBeNull()
    expect(rows.find((r) => r.id === rs.id)).toBeUndefined()
    expect(rows.find((r) => r.is_default)?.archived_at).toBeNull()
  })

  it('rejects two variants with the same combination', async () => {
    const azul = await value('Cor', 'Azul')
    await expect(
      save({
        ...base,
        variants: [
          { sku: 'A', value_ids: [azul] },
          { sku: 'B', value_ids: [azul] },
        ],
      }),
    ).rejects.toThrow(/repetidas/)
    expect(await t.all('select * from products')).toHaveLength(0)
  })

  it('rejects two values of the same type on one variant', async () => {
    const azul = await value('Cor', 'Azul')
    const rosa = await value('Cor', 'Rosa')
    await expect(save({ ...base, variants: [{ sku: 'A', value_ids: [azul, rosa] }] })).rejects.toThrow()
  })

  it('rejects negative prices and duplicate SKUs', async () => {
    await expect(save({ ...base, default_price: -1, variants: [] })).rejects.toThrow(/negativos/)
    await save({ ...base, variants: [] })
    await expect(save({ ...base, name: 'Outro', variants: [] })).rejects.toThrow(/duplicate key/)
  })

  it('updates prices without touching past sales', async () => {
    const id = await save({ ...base, variants: [] })
    const [v] = await variants(id)
    const saleId = await sell(t, await channelId(t, 'Shopee'), 20, [
      { variant_id: v.id, quantity: 1, gross_amount: 25 },
    ])
    await save({ ...base, id, estimated_cost: 9, variants: [] })
    const line = await t.one<{ unit_cost: string }>('select unit_cost from sale_items where sale_id = $1', [saleId])
    expect(n(line.unit_cost)).toBe(6)
  })
})

describe('delete_product', () => {
  it('deletes a product that was never sold', async () => {
    const id = await save({ ...base, variants: [] })
    await t.one('select delete_product($1)', [id])
    expect(await t.all('select * from products')).toHaveLength(0)
  })

  it('refuses to delete a product with sales', async () => {
    const id = await save({ ...base, variants: [] })
    const [v] = await variants(id)
    await sell(t, await channelId(t, 'Shopee'), 20, [{ variant_id: v.id, quantity: 1, gross_amount: 25 }])
    await expect(t.db.query('select delete_product($1)', [id])).rejects.toThrow(/Arquive/)
  })
})
