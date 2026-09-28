import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, n, type TestDb } from './db'
import { channelId, createMaterial, createProduct, sell } from './fixtures'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})

type Report = {
  bucket: string
  summary: Record<string, number | null>
  series: Array<{ date: string; received: number; profit: number }>
  by_channel: Array<{ name: string; received: number; sales_count: number }>
  top_by_units: Array<{ name: string; units: number }>
  top_by_profit: Array<{ name: string; profit: number }>
  costs_by_category: Array<{ name: string; total: number; is_operational: boolean }>
}

const report = async (from: string | null, to: string | null) =>
  (await t.one<{ r: Report }>('select report_overview($1, $2) as r', [from, to])).r

async function purchase(date: string, category: string, total: number) {
  const categoryId = await t.id('select id from categories where name = $1', [category])
  await t.one('select register_purchase($1)', [
    JSON.stringify({
      purchase_date: date,
      items: [{ description: category, category_id: categoryId, quantity: 1, total_amount: total }],
    }),
  ])
}

async function seed() {
  const ml = await channelId(t, 'Mercado Livre')
  const pessoal = await channelId(t, 'Pessoal')
  const lamp = await createProduct(t, 'Luminária', { sku: 'LUM', estimatedCost: 10.9 })
  const key = await createProduct(t, 'Chaveiro', { sku: 'CH', estimatedCost: 2 })
  await sell(t, ml, 19.4, [{ variant_id: lamp.variantId, quantity: 1, gross_amount: 30 }], '2026-09-02')
  await sell(t, pessoal, 30, [{ variant_id: key.variantId, quantity: 3, gross_amount: 30 }], '2026-09-02')
  await sell(t, ml, 15, [{ variant_id: key.variantId, quantity: 1, gross_amount: 20 }], '2026-09-05')
  await sell(t, ml, 50, [{ variant_id: lamp.variantId, quantity: 2, gross_amount: 60 }], '2026-08-20') // other month
  await purchase('2026-09-03', 'Filamentos', 113.9)
  await purchase('2026-09-04', 'Anúncios', 25)
}

describe('report_overview', () => {
  it('summarises sales of the period from their snapshots', async () => {
    await seed()
    const r = await report('2026-09-01', '2026-09-30')
    expect(r.summary).toMatchObject({
      gross: 80,
      received: 64.4,
      fees: 15.6,
      cost: 18.9, // 10,90 + 3 × 2 + 2
      profit: 45.5,
      sales_count: 3,
      units: 5,
      average_ticket: 26.67,
      margin: 70.65,
    })
  })

  it('keeps purchases separate from profit; only operational expenses reduce the result', async () => {
    await seed()
    const { summary } = await report('2026-09-01', '2026-09-30')
    expect(summary.purchases).toBe(138.9)
    expect(summary.operational_expenses).toBe(25)
    expect(summary.operating_result).toBe(20.5)
    expect(summary.profit).toBe(45.5) // unchanged by the filament purchase
  })

  it('returns a daily series with every day of the period, including empty ones', async () => {
    await seed()
    const r = await report('2026-09-01', '2026-09-07')
    expect(r.bucket).toBe('day')
    expect(r.series.map((s) => s.date)).toEqual([
      '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07',
    ])
    expect(r.series[1].received).toBe(49.4)
    expect(r.series[0].received).toBe(0)
  })

  it('switches to monthly buckets for long ranges', async () => {
    await seed()
    const r = await report('2026-01-01', '2026-12-31')
    expect(r.bucket).toBe('month')
    expect(r.series).toHaveLength(12)
    expect(r.series[7]).toMatchObject({ date: '2026-08-01', received: 50 })
  })

  it('ranks channels and products', async () => {
    await seed()
    const r = await report('2026-09-01', '2026-09-30')
    expect(r.by_channel.map((c) => [c.name, c.received, c.sales_count])).toEqual([
      ['Mercado Livre', 34.4, 2],
      ['Pessoal', 30, 1],
    ])
    expect(r.top_by_units.map((p) => [p.name, p.units])).toEqual([
      ['Chaveiro', 4],
      ['Luminária', 1],
    ])
    expect(r.top_by_profit.map((p) => [p.name, p.profit])).toEqual([
      ['Chaveiro', 37],
      ['Luminária', 8.5],
    ])
    expect(r.costs_by_category.map((c) => [c.name, c.total, c.is_operational])).toEqual([
      ['Filamentos', 113.9, false],
      ['Anúncios', 25, true],
    ])
  })

  it('ignores deleted sales', async () => {
    await seed()
    const saleId = await t.id(`select sale_id as id from sale_lines where sale_date = '2026-09-05'`)
    await t.one('select delete_sale($1)', [saleId])
    expect((await report('2026-09-01', '2026-09-30')).summary.sales_count).toBe(2)
  })

  it('handles a period with no data', async () => {
    const r = await report('2026-09-01', '2026-09-30')
    expect(r.summary).toMatchObject({ gross: 0, profit: 0, sales_count: 0, average_ticket: null, margin: null })
    expect(r.by_channel).toEqual([])
  })

  it('refuses non-members', async () => {
    await t.db.query(`select set_config('request.jwt.claim.sub', gen_random_uuid()::text, false)`)
    await expect(report('2026-09-01', '2026-09-30')).rejects.toThrow(/Acesso negado/)
  })
})

describe('low_stock and stock_value', () => {
  it('lists materials and stocked variants below their minimum', async () => {
    const rings = await createMaterial(t, 'Argolas', 'un', 20)
    await t.one(`select register_stock_movement('IN', 12, $1, null, 0.34)`, [rings])
    const ok = await createMaterial(t, 'PLA', 'g', 100)
    await t.one(`select register_stock_movement('IN', 500, $1, null, 0.1)`, [ok])
    const fidget = await createProduct(t, 'Fidget', { sku: 'FID', stockMode: 'stocked' })
    await t.db.query('update product_variants set min_stock = 5 where id = $1', [fidget.variantId])

    const rows = await t.all<{ kind: string; name: string; current_qty: string; shortfall: string }>(
      'select kind, name, current_qty, shortfall from low_stock order by name',
    )
    expect(rows.map((r) => [r.kind, r.name, n(r.current_qty), n(r.shortfall)])).toEqual([
      ['material', 'Argolas', 12, 8],
      ['product', 'Fidget', 0, 5],
    ])

    const value = await t.one<{ materials: string }>('select materials from stock_value')
    expect(n(value.materials)).toBeCloseTo(12 * 0.34 + 500 * 0.1, 2)
  })
})
