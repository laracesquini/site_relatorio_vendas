import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Tables } from '@/types/database'

// Shape of report_overview() (see supabase/migrations/*_reports.sql).
export type OverviewSummary = {
  gross: number
  received: number
  fees: number
  cost: number
  profit: number
  sales_count: number
  units: number
  average_ticket: number | null
  margin: number | null
  purchases: number
  operational_expenses: number
  operating_result: number
}

export type SeriesPoint = {
  date: string
  gross: number
  received: number
  cost: number
  profit: number
  units: number
}

export type ChannelTotal = {
  channel_id: string
  name: string
  gross: number
  received: number
  profit: number
  sales_count: number
}

export type ProductTotal = {
  product_id: string
  name: string
  units: number
  received: number
  profit: number
}

export type CostCategoryTotal = {
  category_id: string | null
  name: string
  is_operational: boolean
  total: number
}

export type Overview = {
  from: string
  to: string
  bucket: 'day' | 'month'
  summary: OverviewSummary
  series: SeriesPoint[]
  by_channel: ChannelTotal[]
  top_by_units: ProductTotal[]
  top_by_profit: ProductTotal[]
  costs_by_category: CostCategoryTotal[]
}

export type LowStockItem = Tables<'low_stock'>

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (from: string | null, to: string | null) => [...dashboardKeys.all, 'overview', from, to] as const,
  lowStock: () => [...dashboardKeys.all, 'low-stock'] as const,
  stockValue: () => [...dashboardKeys.all, 'stock-value'] as const,
}

export async function getOverview(from: string | null, to: string | null): Promise<Overview> {
  const data = await unwrap(
    supabase.rpc('report_overview', {
      ...(from ? { p_from: from } : {}),
      ...(to ? { p_to: to } : {}),
    }),
  )
  return data as unknown as Overview
}

export const listLowStock = () =>
  unwrap(supabase.from('low_stock').select('*').order('kind').order('name'))

export async function getStockValue() {
  const row = await unwrap(supabase.from('stock_value').select('*').single())
  return { materials: Number(row.materials ?? 0), finishedProducts: Number(row.finished_products ?? 0) }
}
