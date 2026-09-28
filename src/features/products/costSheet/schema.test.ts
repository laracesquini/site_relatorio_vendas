import { describe, expect, it } from 'vitest'
import type { VariantView } from '../model'
import type { CostSheet } from './api'
import { costSheetSchema, toCostSheetForm, toSaveCostSheetPayload, type CostSheetForm } from './schema'

const item = { name: 'PLA', unit: 'g', avgCost: 0.1, currentQty: 1000 }
const sheet: CostSheet = {
  materials: [
    { id: '1', variantId: null, inventoryItemId: 'pla', quantity: 50, item },
    { id: '2', variantId: 'grande', inventoryItemId: 'pla', quantity: 120, item },
  ],
  extras: [{ id: 'e', label: 'Energia', amount: 0.5 }],
}
const variants = [
  { id: 'pequeno', isDefault: false },
  { id: 'grande', isDefault: false },
] as VariantView[]

const paths = (v: unknown) => costSheetSchema.safeParse(v).error?.issues.map((i) => i.path.join('.')) ?? []

describe('toCostSheetForm / toSaveCostSheetPayload', () => {
  it('round-trips product rows, variant sheets and extras', () => {
    const form = toCostSheetForm(sheet, variants)
    expect(form.variant_sheets).toEqual([
      { variant_id: 'pequeno', enabled: false, materials: [] },
      { variant_id: 'grande', enabled: true, materials: [{ inventory_item_id: 'pla', quantity: 120 }] },
    ])
    expect(toSaveCostSheetPayload(form)).toEqual({
      materials: [
        { inventory_item_id: 'pla', quantity: 50, variant_id: null },
        { inventory_item_id: 'pla', quantity: 120, variant_id: 'grande' },
      ],
      extra_costs: [{ label: 'Energia', amount: 0.5 }],
    })
  })

  it('drops the rows of a variant sheet that was switched off', () => {
    const form = toCostSheetForm(sheet, variants)
    form.variant_sheets[1].enabled = false
    expect(toSaveCostSheetPayload(form).materials).toHaveLength(1)
  })
})

describe('costSheetSchema', () => {
  const valid: CostSheetForm = { materials: [{ inventory_item_id: 'pla', quantity: 15 }], extras: [], variant_sheets: [] }

  it('accepts a valid sheet and an empty one', () => {
    expect(paths(valid)).toEqual([])
    expect(paths({ materials: [], extras: [], variant_sheets: [] })).toEqual([])
  })

  it('reports every problem at once', () => {
    expect(
      paths({
        materials: [
          { inventory_item_id: null, quantity: 0 },
          { inventory_item_id: 'pla', quantity: 1 },
          { inventory_item_id: 'pla', quantity: 2 },
        ],
        extras: [{ label: '', amount: -1 }],
        variant_sheets: [{ variant_id: 'g', enabled: true, materials: [{ inventory_item_id: null, quantity: 1 }] }],
      }),
    ).toEqual([
      'materials.0.inventory_item_id',
      'materials.0.quantity',
      'materials.2.inventory_item_id',
      'variant_sheets.0.materials.0.inventory_item_id',
      'extras.0.label',
      'extras.0.amount',
    ])
  })

  it('ignores the rows of a disabled variant sheet', () => {
    expect(
      paths({ ...valid, variant_sheets: [{ variant_id: 'g', enabled: false, materials: [{ inventory_item_id: null, quantity: null }] }] }),
    ).toEqual([])
  })
})
