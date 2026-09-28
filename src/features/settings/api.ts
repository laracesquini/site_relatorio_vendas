import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/api'
import type { Tables } from '@/types/database'

export type Channel = Tables<'sales_channels'>
export type Category = Tables<'categories'>
export type CategoryKind = 'product' | 'material' | 'expense'
export type Unit = Tables<'units'>
export type Supplier = Tables<'suppliers'>
export type VariationValue = Tables<'variation_values'>
export type VariationType = Tables<'variation_types'> & { values: VariationValue[] }

export const settingsKeys = {
  channels: ['settings', 'channels'] as const,
  categories: ['settings', 'categories'] as const,
  units: ['settings', 'units'] as const,
  suppliers: ['settings', 'suppliers'] as const,
  variations: ['settings', 'variations'] as const,
}

const now = () => new Date().toISOString()

// Sales channels ------------------------------------------------------------

export const listChannels = () =>
  unwrap(supabase.from('sales_channels').select('*').order('sort_order').order('name'))

export async function saveChannel(values: { id?: string; name: string; is_active: boolean }) {
  const { id, ...row } = values
  if (id) return unwrap(supabase.from('sales_channels').update(row).eq('id', id))
  const channels = await listChannels()
  const sort_order = Math.max(0, ...channels.map((c) => c.sort_order)) + 1
  return unwrap(supabase.from('sales_channels').insert({ ...row, sort_order }))
}

export const deleteChannel = (id: string) =>
  unwrap(supabase.from('sales_channels').delete().eq('id', id))

// Categories ------------------------------------------------------------------

export const listCategories = () =>
  unwrap(supabase.from('categories').select('*').order('name'))

export function saveCategory(values: {
  id?: string
  name: string
  kind: CategoryKind
  is_operational: boolean
}) {
  const { id, ...row } = values
  return id
    ? unwrap(supabase.from('categories').update(row).eq('id', id))
    : unwrap(supabase.from('categories').insert(row))
}

export const setCategoryArchived = (id: string, archived: boolean) =>
  unwrap(supabase.from('categories').update({ archived_at: archived ? now() : null }).eq('id', id))

export const deleteCategory = (id: string) =>
  unwrap(supabase.from('categories').delete().eq('id', id))

// Units -----------------------------------------------------------------------

export const listUnits = () => unwrap(supabase.from('units').select('*').order('name'))

export function saveUnit(values: { id?: string; code: string; name: string }) {
  const { id, ...row } = values
  return id
    ? unwrap(supabase.from('units').update(row).eq('id', id))
    : unwrap(supabase.from('units').insert(row))
}

export const deleteUnit = (id: string) => unwrap(supabase.from('units').delete().eq('id', id))

// Suppliers -------------------------------------------------------------------

export const listSuppliers = () => unwrap(supabase.from('suppliers').select('*').order('name'))

export function saveSupplier(values: {
  id?: string
  name: string
  contact: string | null
  notes: string | null
}) {
  const { id, ...row } = values
  return id
    ? unwrap(supabase.from('suppliers').update(row).eq('id', id))
    : unwrap(supabase.from('suppliers').insert(row).select().single())
}

export const setSupplierArchived = (id: string, archived: boolean) =>
  unwrap(supabase.from('suppliers').update({ archived_at: archived ? now() : null }).eq('id', id))

export const deleteSupplier = (id: string) =>
  unwrap(supabase.from('suppliers').delete().eq('id', id))

// Variation types and values --------------------------------------------------

export async function listVariationTypes(): Promise<VariationType[]> {
  const rows = await unwrap(
    supabase
      .from('variation_types')
      .select('*, values:variation_values(*)')
      .order('sort_order')
      .order('name'),
  )
  return rows.map((t) => ({
    ...t,
    values: [...t.values].sort((a, b) => a.sort_order - b.sort_order || a.value.localeCompare(b.value, 'pt-BR')),
  }))
}

export async function saveVariationType(values: { id?: string; name: string }) {
  const { id, ...row } = values
  if (id) return unwrap(supabase.from('variation_types').update(row).eq('id', id))
  const types = await listVariationTypes()
  const sort_order = Math.max(0, ...types.map((t) => t.sort_order)) + 1
  return unwrap(supabase.from('variation_types').insert({ ...row, sort_order }))
}

export const deleteVariationType = (id: string) =>
  unwrap(supabase.from('variation_types').delete().eq('id', id))

export const createVariationValue = (variationTypeId: string, value: string) =>
  unwrap(
    supabase
      .from('variation_values')
      .insert({ variation_type_id: variationTypeId, value })
      .select()
      .single(),
  )

export const renameVariationValue = (id: string, value: string) =>
  unwrap(supabase.from('variation_values').update({ value }).eq('id', id))

export const deleteVariationValue = (id: string) =>
  unwrap(supabase.from('variation_values').delete().eq('id', id))
