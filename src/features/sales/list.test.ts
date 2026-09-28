import { describe, expect, it } from 'vitest'
import type { SaleLine } from './api'
import { attributeColumns, searchSaleLines, sortSaleLines } from './list'

const line = (over: Partial<SaleLine>): SaleLine =>
  ({
    id: over.id ?? 'x',
    product_name: 'Plaquinha Pet',
    sku: 'PET',
    channel_name: 'Shopee',
    sale_date: '2026-09-10',
    created_at: '2026-09-10T12:00:00Z',
    profit: 5,
    margin: 20,
    variant_attributes: {},
    variant_label: null,
    customization_notes: null,
    notes: null,
    ...over,
  }) as SaleLine

describe('searchSaleLines', () => {
  const lines = [
    line({ id: 'a', product_name: 'Chaveiro Nome', customization_notes: 'Lara' }),
    line({ id: 'b', variant_attributes: { Cor: 'Azul' } }),
    line({ id: 'c', product_name: 'Luminária Lua', sku: 'LUM-LUA' }),
  ]
  const ids = (term: string) => searchSaleLines(lines, term).map((l) => l.id)

  it('matches product, SKU, attributes and customization, ignoring accents and case', () => {
    expect(ids('lara')).toEqual(['a'])
    expect(ids('AZUL')).toEqual(['b'])
    expect(ids('luminaria')).toEqual(['c'])
    expect(ids('lum-lua')).toEqual(['c'])
  })

  it('returns everything for an empty search', () => {
    expect(ids('  ')).toHaveLength(3)
  })
})

describe('sortSaleLines', () => {
  const lines = [
    line({ id: 'a', sale_date: '2026-09-01', profit: 10, created_at: '2026-09-01T10:00:00Z' }),
    line({ id: 'b', sale_date: '2026-09-05', profit: -2, created_at: '2026-09-05T10:00:00Z' }),
    line({ id: 'c', sale_date: '2026-09-05', profit: 3, created_at: '2026-09-05T11:00:00Z' }),
  ]
  const ids = (key: 'sale_date' | 'profit', dir: 'asc' | 'desc') =>
    sortSaleLines(lines, { key, dir }).map((l) => l.id)

  it('sorts by date, newest registration first on ties', () => {
    expect(ids('sale_date', 'desc')).toEqual(['c', 'b', 'a'])
  })

  it('sorts numbers numerically, including negatives', () => {
    expect(ids('profit', 'asc')).toEqual(['b', 'c', 'a'])
  })

  it('puts empty values last', () => {
    const withNull = [line({ id: 'n', margin: null }), line({ id: 'm', margin: 10 })]
    expect(sortSaleLines(withNull, { key: 'margin', dir: 'desc' }).map((l) => l.id)).toEqual(['m', 'n'])
    expect(sortSaleLines(withNull, { key: 'margin', dir: 'asc' }).map((l) => l.id)).toEqual(['m', 'n'])
  })
})

describe('attributeColumns', () => {
  it('lists Cor, Tamanho and Modelo first, then others alphabetically', () => {
    const cols = attributeColumns([
      line({ variant_attributes: { Tamanho: 'P', Acabamento: 'Fosco' } }),
      line({ variant_attributes: { Cor: 'Azul' } }),
    ])
    expect(cols).toEqual(['Cor', 'Tamanho', 'Acabamento'])
  })
})
