import type { Overview } from '../api'

/** A realistic month of data for tests and visual previews. */
export const sampleOverview: Overview = {
  from: '2026-09-01',
  to: '2026-09-30',
  bucket: 'day',
  summary: {
    gross: 2480,
    received: 1935.6,
    fees: 544.4,
    cost: 702.3,
    profit: 1233.3,
    sales_count: 62,
    units: 97,
    average_ticket: 40,
    margin: 63.72,
    purchases: 540.5,
    operational_expenses: 120,
    operating_result: 1113.3,
  },
  series: Array.from({ length: 30 }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    const gross = [0, 6].includes(i % 7) ? 40 + i * 2 : 70 + ((i * 37) % 60)
    const received = Math.round(gross * 0.78 * 100) / 100
    const cost = Math.round(gross * 0.28 * 100) / 100
    return {
      date: `2026-09-${day}`,
      gross,
      received,
      cost,
      profit: i === 9 ? -12 : Math.round((received - cost) * 100) / 100,
      units: Math.round(gross / 25),
    }
  }),
  by_channel: [
    { channel_id: 'ml', name: 'Mercado Livre', gross: 1100, received: 780.4, profit: 480, sales_count: 25 },
    { channel_id: 'sh', name: 'Shopee', gross: 820, received: 615.2, profit: 390, sales_count: 21 },
    { channel_id: 'ps', name: 'Pessoal', gross: 400, received: 400, profit: 280, sales_count: 11 },
    { channel_id: 'tt', name: 'TikTok Shop', gross: 160, received: 140, profit: 83.3, sales_count: 5 },
  ],
  top_by_units: [
    { product_id: 'p1', name: 'Chaveiro Personalizado', units: 38, received: 520, profit: 390 },
    { product_id: 'p2', name: 'Plaquinha Pet', units: 21, received: 480, profit: 300 },
    { product_id: 'p3', name: 'Fidget Estrela', units: 17, received: 250, profit: 170 },
    { product_id: 'p4', name: 'Luminária Lua', units: 6, received: 360, profit: 180 },
  ],
  top_by_profit: [
    { product_id: 'p1', name: 'Chaveiro Personalizado', units: 38, received: 520, profit: 390 },
    { product_id: 'p2', name: 'Plaquinha Pet', units: 21, received: 480, profit: 300 },
    { product_id: 'p4', name: 'Luminária Lua', units: 6, received: 360, profit: 180 },
    { product_id: 'p3', name: 'Fidget Estrela', units: 17, received: 250, profit: 170 },
  ],
  costs_by_category: [
    { category_id: 'c1', name: 'Filamentos', is_operational: false, total: 304.9 },
    { category_id: 'c2', name: 'Anúncios', is_operational: true, total: 120 },
    { category_id: 'c3', name: 'Argolas e ferragens', is_operational: false, total: 68.2 },
    { category_id: 'c4', name: 'Embalagens', is_operational: false, total: 47.4 },
  ],
}
