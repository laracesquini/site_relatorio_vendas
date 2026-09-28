import type { SaleLine } from './api'

// Pure search and sorting for the sales list (filters by date, channel,
// product, category and customization are applied by the database query).

export type SortKey =
  | 'sale_date'
  | 'product_name'
  | 'sku'
  | 'channel_name'
  | 'quantity'
  | 'gross_amount'
  | 'received_amount'
  | 'fees'
  | 'total_cost'
  | 'profit'
  | 'margin'

export type Sort = { key: SortKey; dir: 'asc' | 'desc' }

export const DEFAULT_SORT: Sort = { key: 'sale_date', dir: 'desc' }

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Attributes snapshot, e.g. { Cor: 'Azul', Tamanho: 'Pequeno' }. */
export function attributesOf(line: Pick<SaleLine, 'variant_attributes'>): Record<string, string> {
  const raw = line.variant_attributes
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as Record<string, string>
}

export function searchSaleLines<T extends SaleLine>(lines: T[], term: string): T[] {
  const q = normalize(term.trim())
  if (!q) return lines
  return lines.filter((l) =>
    [
      l.product_name,
      l.sku,
      l.variant_label,
      l.channel_name,
      l.customization_notes,
      l.notes,
      ...Object.values(attributesOf(l)),
    ].some((field) => field && normalize(field).includes(q)),
  )
}

export function sortSaleLines<T extends SaleLine>(lines: T[], sort: Sort): T[] {
  const factor = sort.dir === 'asc' ? 1 : -1
  return [...lines].sort((a, b) => {
    const x = a[sort.key]
    const y = b[sort.key]
    let result: number
    if (x === null || x === undefined) result = y === null || y === undefined ? 0 : 1
    else if (y === null || y === undefined) result = -1
    else if (typeof x === 'number' && typeof y === 'number') result = (x - y) * factor
    else result = String(x).localeCompare(String(y), 'pt-BR') * factor
    // Ties (e.g. same day): newest registered first.
    return result || (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })
}

/** Columns for the variation types present in the lines, in a stable order. */
export function attributeColumns(lines: SaleLine[], preferred = ['Cor', 'Tamanho', 'Modelo']): string[] {
  const names = new Set<string>()
  for (const l of lines) for (const k of Object.keys(attributesOf(l))) names.add(k)
  return [...names].sort((a, b) => {
    const ia = preferred.indexOf(a)
    const ib = preferred.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.localeCompare(b, 'pt-BR')
  })
}
