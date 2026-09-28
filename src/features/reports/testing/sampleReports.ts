import type { CashFlow, ReportDetails } from '../api'

/** A small month of data for tests and visual previews. */
export const sampleDetails: ReportDetails = {
  from: '2026-09-01',
  to: '2026-09-30',
  bucket: 'week',
  series: [
    { date: '2026-08-31', gross: 30, received: 19.4, fees: 10.6, cost: 10.9, profit: 8.5, units: 1, sales_count: 1, margin: 43.81 },
    { date: '2026-09-07', gross: 50, received: 45, fees: 5, cost: 8, profit: 37, units: 4, sales_count: 2, margin: 82.22 },
    { date: '2026-09-14', gross: 0, received: 0, fees: 0, cost: 0, profit: 0, units: 0, sales_count: 0, margin: null },
  ],
  cost_series: [
    { date: '2026-08-31', to_stock: 113.9, operational: 25, other: 0, total: 138.9 },
    { date: '2026-09-07', to_stock: 0, operational: 40, other: 0, total: 40 },
    { date: '2026-09-14', to_stock: 34.11, operational: 0, other: 10, total: 44.11 },
  ],
  by_product: [
    { product_id: 'ch', name: 'Chaveiro', category_name: 'Chaveiros', units: 4, sales_count: 2, gross: 50, received: 45, fees: 5, cost: 8, profit: 37, margin: 82.22 },
    { product_id: 'lum', name: 'Luminária', category_name: null, units: 1, sales_count: 1, gross: 30, received: 19.4, fees: 10.6, cost: 10.9, profit: 8.5, margin: 43.81 },
  ],
  by_channel: [
    { channel_id: 'ml', name: 'Mercado Livre', units: 2, sales_count: 2, gross: 50, received: 34.4, fees: 15.6, cost: 12.9, profit: 21.5, fee_percent: 31.2, margin: 62.5 },
    { channel_id: 'ps', name: 'Pessoal', units: 3, sales_count: 1, gross: 30, received: 30, fees: 0, cost: 6, profit: 24, fee_percent: 0, margin: 80 },
  ],
  by_category: [
    { category_id: 'c', name: 'Chaveiros', units: 4, gross: 50, received: 45, cost: 8, profit: 37, margin: 82.22 },
    { category_id: null, name: 'Sem categoria', units: 1, gross: 30, received: 19.4, cost: 10.9, profit: 8.5, margin: 43.81 },
  ],
  costs_by_category: [
    { category_id: 'f', name: 'Filamentos', kind: 'stock', total: 148.01 },
    { category_id: 'fe', name: 'Ferramentas e equipamentos', kind: 'operational', total: 40 },
    { category_id: 'a', name: 'Anúncios', kind: 'operational', total: 25 },
    { category_id: null, name: 'Sem categoria', kind: 'other', total: 10 },
  ],
}

export const sampleCashFlow: CashFlow = {
  from: '2026-09-01',
  to: '2026-09-30',
  bucket: 'week',
  totals: { sales_in: 64.4, other_in: 80, inflows: 144.4, outflows: 223.01, balance: -78.61 },
  series: [
    { date: '2026-08-31', sales_in: 19.4, other_in: 0, inflows: 19.4, outflows: 138.9, net: -119.5, cumulative: -119.5 },
    { date: '2026-09-07', sales_in: 45, other_in: 0, inflows: 45, outflows: 40, net: 5, cumulative: -114.5 },
    { date: '2026-09-14', sales_in: 0, other_in: 80, inflows: 80, outflows: 44.11, net: 35.89, cumulative: -78.61 },
  ],
}
