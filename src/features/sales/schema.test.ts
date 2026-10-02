import { describe, expect, it } from 'vitest'
import { saleFormSchema, toCreateSalePayload, type SaleFormValues } from './schema'

const valid: SaleFormValues = {
  product_id: 'p',
  variant_id: 'v',
  quantity: 1,
  channel_id: 'c',
  sale_date: '2026-09-28',
  gross_amount: 30,
  received_amount: 19.4,
  unit_cost: 10.9,
  is_customized: false,
  customization_notes: '',
  notes: '',
}

const issuePaths = (values: unknown) =>
  saleFormSchema.safeParse(values).error?.issues.map((i) => i.path.join('.')) ?? []

describe('saleFormSchema', () => {
  it('accepts a complete sale', () => {
    expect(saleFormSchema.safeParse(valid).success).toBe(true)
  })

  it('requires product, variant, channel and amounts', () => {
    const paths = issuePaths({
      ...valid,
      product_id: null,
      variant_id: null,
      channel_id: null,
      gross_amount: null,
      received_amount: null,
    })
    expect(paths).toEqual(
      expect.arrayContaining(['product_id', 'variant_id', 'channel_id', 'gross_amount', 'received_amount']),
    )
  })

  it('rejects fractional or zero quantity and negative amounts', () => {
    expect(issuePaths({ ...valid, quantity: 1.5 })).toContain('quantity')
    expect(issuePaths({ ...valid, quantity: 0 })).toContain('quantity')
    expect(issuePaths({ ...valid, gross_amount: -1, received_amount: -2 })).toEqual(
      expect.arrayContaining(['gross_amount', 'received_amount']),
    )
  })

  it('rejects received greater than gross', () => {
    expect(issuePaths({ ...valid, received_amount: 31 })).toEqual(['received_amount'])
  })
})

describe('toCreateSalePayload', () => {
  it('builds a single-item sale with the cost shown on screen', () => {
    const payload = toCreateSalePayload({ ...valid, quantity: 2 })
    expect(payload).toMatchObject({ channel_id: 'c', received_amount: 19.4, notes: null })
    expect(payload.items).toEqual([
      {
        variant_id: 'v',
        quantity: 2,
        gross_amount: 30,
        unit_cost: 10.9,
        is_customized: false,
        customization_notes: null,
      },
    ])
  })

  it('keeps customization notes only for customized sales', () => {
    expect(
      toCreateSalePayload({ ...valid, is_customized: true, customization_notes: ' Mel ' }).items[0]
        .customization_notes,
    ).toBe('Mel')
    expect(
      toCreateSalePayload({ ...valid, is_customized: false, customization_notes: 'Mel' }).items[0]
        .customization_notes,
    ).toBeNull()
  })
})
