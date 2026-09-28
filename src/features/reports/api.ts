import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Bucket } from '@/lib/format'
import type { Tables } from '@/types/database'

// Shapes of report_details() and report_cash_flow() (see *_reports_details.sql).

export type ResultPoint = {
  date: string
  gross: number
  received: number
  fees: number
  cost: number
  profit: number
  units: number
  sales_count: number
  margin: number | null
}

export type CostPoint = { date: string; to_stock: number; operational: number; other: number; total: number }

type Totals = { gross: number; received: number; fees: number; cost: number; profit: number; units: number; margin: number | null }

export type ProductResult = Totals & { product_id: string; name: string; category_name: string | null; sales_count: number }
export type ChannelResult = Totals & { channel_id: string; name: string; sales_count: number; fee_percent: number | null }
export type CategoryResult = Omit<Totals, 'fees'> & { category_id: string | null; name: string }
export type CostCategory = { category_id: string | null; name: string; kind: 'stock' | 'operational' | 'other'; total: number }

export type ReportDetails = {
  from: string
  to: string
  bucket: Bucket
  series: ResultPoint[]
  cost_series: CostPoint[]
  by_product: ProductResult[]
  by_channel: ChannelResult[]
  by_category: CategoryResult[]
  costs_by_category: CostCategory[]
}

export type CashPoint = {
  date: string
  sales_in: number
  other_in: number
  inflows: number
  outflows: number
  net: number
  cumulative: number
}

export type CashFlow = {
  from: string
  to: string
  bucket: Bucket
  totals: { sales_in: number; other_in: number; inflows: number; outflows: number; balance: number }
  series: CashPoint[]
}

export type OtherIncome = Tables<'other_incomes'>

export type ReportQuery = { from: string | null; to: string | null; bucket: Bucket | null }

export const reportKeys = {
  all: ['reports'] as const,
  details: (q: ReportQuery) => [...reportKeys.all, 'details', q] as const,
  cashFlow: (q: ReportQuery) => [...reportKeys.all, 'cash-flow', q] as const,
  otherIncomes: (from: string | null, to: string | null) => [...reportKeys.all, 'other-incomes', from, to] as const,
}

const rangeArgs = ({ from, to, bucket }: ReportQuery) => ({
  ...(from ? { p_from: from } : {}),
  ...(to ? { p_to: to } : {}),
  ...(bucket ? { p_bucket: bucket } : {}),
})

export const getReportDetails = async (q: ReportQuery) =>
  (await unwrap(supabase.rpc('report_details', rangeArgs(q)))) as unknown as ReportDetails

export const getCashFlow = async (q: ReportQuery) =>
  (await unwrap(supabase.rpc('report_cash_flow', rangeArgs(q)))) as unknown as CashFlow

export function listOtherIncomes(from: string | null, to: string | null) {
  let query = supabase.from('other_incomes').select('*').is('deleted_at', null).order('income_date', { ascending: false })
  if (from) query = query.gte('income_date', from)
  if (to) query = query.lte('income_date', to)
  return unwrap(query)
}

export function saveOtherIncome(values: { id?: string; income_date: string; description: string; amount: number; notes: string | null }) {
  const { id, ...row } = values
  return id
    ? unwrap(supabase.from('other_incomes').update(row).eq('id', id))
    : unwrap(supabase.from('other_incomes').insert(row))
}

/** Soft delete: the record stays in the database, out of every total. */
export const deleteOtherIncome = (id: string) =>
  unwrap(supabase.from('other_incomes').update({ deleted_at: new Date().toISOString() }).eq('id', id))

export const useReportDetails = (q: ReportQuery) =>
  useQuery({ queryKey: reportKeys.details(q), queryFn: () => getReportDetails(q), placeholderData: keepPreviousData })

export const useCashFlow = (q: ReportQuery) =>
  useQuery({ queryKey: reportKeys.cashFlow(q), queryFn: () => getCashFlow(q), placeholderData: keepPreviousData })

export const useOtherIncomes = (from: string | null, to: string | null) =>
  useQuery({ queryKey: reportKeys.otherIncomes(from, to), queryFn: () => listOtherIncomes(from, to) })
