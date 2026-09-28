import { describe, expect, it } from 'vitest'
import { toCsv, type CsvColumn } from './csv'

type Row = { date: string; name: string; total: number; custom: boolean; note: string | null }
const columns: CsvColumn<Row>[] = [
  { label: 'Data', value: (r) => r.date },
  { label: 'Produto', value: (r) => r.name },
  { label: 'Total (R$)', value: (r) => r.total },
  { label: 'Personalizado', value: (r) => r.custom },
  { label: 'Obs.', value: (r) => r.note },
]

describe('toCsv', () => {
  it('uses semicolons, decimal commas and DD/MM/YYYY for Excel in Portuguese', () => {
    const csv = toCsv(columns, [{ date: '2026-09-02', name: 'Luminária Lua', total: 1234.5, custom: false, note: null }])
    expect(csv).toBe('Data;Produto;Total (R$);Personalizado;Obs.\r\n02/09/2026;Luminária Lua;1234,5;Não;')
  })

  it('quotes text containing separators, quotes or line breaks', () => {
    const csv = toCsv(columns, [
      { date: '2026-09-02', name: 'Kit "Festa"; 10 un', total: 0.1139, custom: true, note: 'Nome: Mel\nTel' },
    ])
    expect(csv.split('\r\n')[1]).toBe('02/09/2026;"Kit ""Festa""; 10 un";0,1139;Sim;"Nome: Mel\nTel"')
  })

  it('writes only the header for no rows', () => {
    expect(toCsv(columns, [])).toBe('Data;Produto;Total (R$);Personalizado;Obs.')
  })
})
