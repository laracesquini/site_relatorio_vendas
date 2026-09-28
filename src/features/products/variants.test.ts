import { describe, expect, it } from 'vitest'
import { combine, comboKey, mergeCombinations, suggestSku, type ValueRef } from './variants'

const v = (id: string, value: string, typeId: string): ValueRef => ({ id, value, typeId })
const azul = v('a', 'Azul', 'cor')
const rosa = v('r', 'Rosa', 'cor')
const pequeno = v('p', 'Pequeno', 'tam')
const grande = v('g', 'Grande', 'tam')

describe('combine', () => {
  it('builds the cartesian product of the selected values', () => {
    const combos = combine([[azul, rosa], [pequeno, grande]])
    expect(combos.map((c) => c.map((x) => x.value).join(' / '))).toEqual([
      'Azul / Pequeno',
      'Azul / Grande',
      'Rosa / Pequeno',
      'Rosa / Grande',
    ])
  })

  it('ignores types with nothing selected', () => {
    expect(combine([[azul, rosa], []])).toHaveLength(2)
    expect(combine([[], []])).toEqual([])
  })
})

describe('suggestSku', () => {
  it('joins the base SKU with normalized values', () => {
    expect(suggestSku('pet', ['Azul', 'Pequeno'])).toBe('PET-AZUL-PEQUENO')
    expect(suggestSku('FID', ['Roxo/Dourado'])).toBe('FID-ROXODOURADO')
    expect(suggestSku('VASO', ['Médio'])).toBe('VASO-MEDIO')
  })
})

describe('mergeCombinations', () => {
  it('keeps existing rows and appends only new combinations', () => {
    const current = [{ valueIds: ['p', 'a'], sku: 'EXISTENTE' }]
    const merged = mergeCombinations(current, combine([[azul, rosa], [pequeno]]), (combo) => ({
      valueIds: combo.map((x) => x.id),
      sku: 'NOVO',
    }))
    expect(merged.map((m) => m.sku)).toEqual(['EXISTENTE', 'NOVO'])
    expect(comboKey(merged[1].valueIds)).toBe(comboKey(['r', 'p']))
  })
})
