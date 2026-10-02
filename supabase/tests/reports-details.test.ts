import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './db'
import { buy, channelId, createMaterial, createProduct, sell } from './fixtures'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})

type Json = Record<string, unknown>
const details = async (from: string | null, to: string | null, bucket: string | null = null) =>
  (await t.one<{ r: Json }>('select report_details($1, $2, $3) as r', [from, to, bucket])).r
const cash = async (from: string | null, to: string | null, bucket: string | null = null) =>
  (await t.one<{ r: Json }>('select report_cash_flow($1, $2, $3) as r', [from, to, bucket])).r

async function expense(date: string, category: string, total: number) {
  const categoryId = await t.id('select id from categories where name = $1', [category])
  await t.one('select register_purchase($1)', [
    JSON.stringify({ purchase_date: date, items: [{ description: category, category_id: categoryId, quantity: 1, total_amount: total }] }),
  ])
}

async function seed() {
  const ml = await channelId(t, 'Mercado Livre')
  const pessoal = await channelId(t, 'Pessoal')
  const lamp = await createProduct(t, 'Luminária', { sku: 'LUM', estimatedCost: 10.9 })
  const key = await createProduct(t, 'Chaveiro', { sku: 'CH', estimatedCost: 2 })
  await sell(t, ml, 19.4, [{ variant_id: lamp.variantId, quantity: 1, gross_amount: 30 }], '2026-09-02')
  await sell(t, pessoal, 30, [{ variant_id: key.variantId, quantity: 3, gross_amount: 30 }], '2026-09-09')
  await sell(t, ml, 15, [{ variant_id: key.variantId, quantity: 1, gross_amount: 20 }], '2026-09-10')
  const pla = await createMaterial(t, 'PLA')
  await buy(t, pla, 1, 113.9, 1000) // 2026-09-01, into stock
  await expense('2026-09-04', 'Anúncios', 25)
  await expense('2026-09-11', 'Ferramentas e equipamentos', 40)
}

describe('report_details', () => {
  it('lists every product with its totals and margin', async () => {
    await seed()
    const r = await details('2026-09-01', '2026-09-30')
    expect(r.by_product).toEqual([
      expect.objectContaining({ name: 'Chaveiro', units: 4, sales_count: 2, gross: 50, received: 45, fees: 5, cost: 8, profit: 37, margin: 82.22 }),
      expect.objectContaining({ name: 'Luminária', units: 1, received: 19.4, cost: 10.9, profit: 8.5, margin: 43.81 }),
    ])
  })

  it('shows marketplace fees per channel', async () => {
    await seed()
    const r = await details('2026-09-01', '2026-09-30')
    expect(r.by_channel).toEqual([
      expect.objectContaining({ name: 'Mercado Livre', gross: 50, received: 34.4, fees: 15.6, fee_percent: 31.2, sales_count: 2 }),
      expect.objectContaining({ name: 'Pessoal', fees: 0, fee_percent: 0 }),
    ])
  })

  it('groups by week when asked', async () => {
    await seed()
    const r = await details('2026-09-01', '2026-09-14', 'week')
    const series = r.series as Array<{ date: string; received: number; sales_count: number }>
    // Weeks start on Monday: 31/08, 07/09, 14/09
    expect(series.map((s) => [s.date, s.received, s.sales_count])).toEqual([
      ['2026-08-31', 19.4, 1],
      ['2026-09-07', 45, 2],
      ['2026-09-14', 0, 0],
    ])
  })

  it('splits cost evolution into stock, operational and other', async () => {
    await seed()
    const r = await details('2026-09-01', '2026-09-30', 'month')
    expect(r.cost_series).toEqual([{ date: '2026-09-01', to_stock: 113.9, operational: 65, other: 0, total: 178.9 }])
    expect((r.costs_by_category as Json[]).map((c) => [c.name, c.kind, c.total])).toEqual([
      ['Sem categoria', 'stock', 113.9],
      ['Ferramentas e equipamentos', 'operational', 40],
      ['Anúncios', 'operational', 25],
    ])
  })

  it('rejects an unknown grouping', async () => {
    await expect(details('2026-09-01', '2026-09-30', 'year')).rejects.toThrow(/Agrupamento/)
  })
})

describe('report_cash_flow', () => {
  it('adds received amounts and other income, subtracts purchases', async () => {
    await seed()
    await t.db.query(`insert into other_incomes (income_date, description, amount) values ('2026-09-15', 'Aula de impressão 3D', 80)`)
    const r = await cash('2026-09-01', '2026-09-30', 'month')
    expect(r.totals).toEqual({ sales_in: 64.4, other_in: 80, inflows: 144.4, outflows: 178.9, balance: -34.5 })
  })

  it('is not the same as profit: the filament purchase is cash out now', async () => {
    await seed()
    const flow = (await cash('2026-09-01', '2026-09-30')).totals as Json
    const profit = await t.one<{ p: string }>(`select sum(profit) as p from sale_lines`)
    expect(Number(profit.p)).toBe(45.5)
    expect(flow.balance).toBe(-114.5)
  })

  it('keeps a running balance per day', async () => {
    await seed()
    const r = await cash('2026-09-01', '2026-09-04')
    const series = r.series as Array<{ date: string; net: number; cumulative: number }>
    expect(series.map((s) => [s.date, s.net, s.cumulative])).toEqual([
      ['2026-09-01', -113.9, -113.9],
      ['2026-09-02', 19.4, -94.5],
      ['2026-09-03', 0, -94.5],
      ['2026-09-04', -25, -119.5],
    ])
  })

  it('ignores deleted income, sales and purchases', async () => {
    await seed()
    await t.db.query(`insert into other_incomes (income_date, description, amount, deleted_at) values ('2026-09-15', 'X', 80, now())`)
    const saleId = await t.id(`select sale_id as id from sale_lines where sale_date = '2026-09-02'`)
    await t.one('select delete_sale($1)', [saleId])
    const totals = (await cash('2026-09-01', '2026-09-30')).totals as Json
    expect(totals).toMatchObject({ sales_in: 45, other_in: 0 })
  })

  it('refuses non-members', async () => {
    await t.db.query(`select set_config('request.jwt.claim.sub', gen_random_uuid()::text, false)`)
    await expect(cash('2026-09-01', '2026-09-30')).rejects.toThrow(/Acesso negado/)
  })
})
