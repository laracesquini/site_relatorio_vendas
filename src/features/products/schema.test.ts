import { describe, expect, it } from 'vitest'
import { emptyProductForm, productFormSchema, toSavePayload, type ProductFormValues } from './schema'

const valid: ProductFormValues = { ...emptyProductForm, name: 'Plaquinha Pet', sku: 'PET', default_price: 25 }
const variant = (sku: string, valueIds = [sku]) => ({
  valueIds,
  label: sku,
  sku,
  price: null,
  cost_override: null,
  min_stock: null,
  is_active: true,
})

describe('productFormSchema', () => {
  it('accepts a simple product', () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true)
  })

  it('requires name, SKU and a non-negative price', () => {
    const result = productFormSchema.safeParse({ ...valid, name: ' ', sku: '', default_price: -1 })
    expect(result.success).toBe(false)
    const paths = result.error?.issues.map((i) => i.path.join('.'))
    expect(paths).toEqual(expect.arrayContaining(['name', 'sku', 'default_price']))
  })

  it('requires at least one variant when variations are on', () => {
    const result = productFormSchema.safeParse({ ...valid, has_variations: true })
    expect(result.error?.issues[0].path).toEqual(['variants'])
  })

  it('flags repeated variant SKUs', () => {
    const result = productFormSchema.safeParse({
      ...valid,
      has_variations: true,
      variants: [variant('PET-A', ['a']), variant('pet-a', ['b'])],
    })
    expect(result.error?.issues[0].path).toEqual(['variants', 1, 'sku'])
  })
})

describe('toSavePayload', () => {
  it('sends no variants for a product without variations', () => {
    const payload = toSavePayload({ ...valid, variants: [variant('X')] })
    expect(payload.variants).toEqual([])
  })

  it('never auto-deducts materials at sale time for stocked products', () => {
    const payload = toSavePayload({ ...valid, stock_mode: 'stocked', auto_deduct_materials: true })
    expect(payload.auto_deduct_materials).toBe(false)
  })

  it('maps empty optional amounts to zero', () => {
    const payload = toSavePayload(valid)
    expect(payload.estimated_cost).toBe(0)
    expect(payload.min_stock).toBe(0)
  })
})
