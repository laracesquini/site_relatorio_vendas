import { z } from 'zod'
import type { ProductView } from './model'

const optionalAmount = z.number().min(0, 'Não pode ser negativo').nullable()

export const variantFormSchema = z.object({
  id: z.string().optional(),
  valueIds: z.array(z.string()).min(1),
  label: z.string(),
  sku: z.string().trim().min(1, 'Informe o SKU'),
  price: optionalAmount,
  cost_override: optionalAmount,
  min_stock: optionalAmount,
  is_active: z.boolean(),
})

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome'),
    sku: z.string().trim().min(1, 'Informe o SKU'),
    description: z.string(),
    category_id: z.string().nullable(),
    is_active: z.boolean(),
    is_customizable: z.boolean(),
    default_price: z.number({ error: 'Informe o preço' }).min(0, 'Não pode ser negativo'),
    estimated_cost: optionalAmount,
    stock_mode: z.enum(['made_to_order', 'stocked']),
    auto_deduct_materials: z.boolean(),
    min_stock: optionalAmount,
    has_variations: z.boolean(),
    variants: z.array(variantFormSchema),
  })
  .superRefine((values, ctx) => {
    if (!values.has_variations) return
    if (values.variants.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Gere pelo menos uma variação' })
    }
    const seen = new Map<string, number>()
    values.variants.forEach((v, i) => {
      const key = v.sku.trim().toLowerCase()
      if (!key) return
      if (seen.has(key) || key === values.sku.trim().toLowerCase()) {
        ctx.addIssue({ code: 'custom', path: ['variants', i, 'sku'], message: 'SKU repetido' })
      }
      seen.set(key, i)
    })
  })

export type ProductFormValues = z.infer<typeof productFormSchema>
export type VariantFormValues = z.infer<typeof variantFormSchema>

export type SaveProductPayload = {
  id?: string
  name: string
  sku: string
  description: string | null
  category_id: string | null
  is_active: boolean
  is_customizable: boolean
  default_price: number
  estimated_cost: number
  stock_mode: 'made_to_order' | 'stocked'
  auto_deduct_materials: boolean
  min_stock: number
  variants: Array<{
    id?: string
    sku: string
    price: number | null
    cost_override: number | null
    min_stock: number
    is_active: boolean
    value_ids: string[]
  }>
}

export const emptyProductForm: ProductFormValues = {
  name: '',
  sku: '',
  description: '',
  category_id: null,
  is_active: true,
  is_customizable: false,
  default_price: 0,
  estimated_cost: null,
  stock_mode: 'made_to_order',
  auto_deduct_materials: false,
  min_stock: null,
  has_variations: false,
  variants: [],
}

export function toFormValues(product: ProductView): ProductFormValues {
  const defaultVariant = product.variants.find((v) => v.isDefault)
  return {
    name: product.name,
    sku: product.sku,
    description: product.description ?? '',
    category_id: product.category_id,
    is_active: product.is_active,
    is_customizable: product.is_customizable,
    default_price: product.default_price,
    estimated_cost: product.estimated_cost || null,
    stock_mode: product.stockMode,
    auto_deduct_materials: product.auto_deduct_materials,
    min_stock: defaultVariant?.minStock || null,
    has_variations: product.hasVariations,
    variants: product.variants
      .filter((v) => !v.isDefault)
      .map((v) => ({
        id: v.id,
        valueIds: v.valueIds,
        label: v.label,
        sku: v.sku,
        price: v.ownPrice,
        cost_override: v.costOverride,
        min_stock: v.minStock || null,
        is_active: v.isActive,
      })),
  }
}

export function toSavePayload(values: ProductFormValues, id?: string): SaveProductPayload {
  return {
    id,
    name: values.name.trim(),
    sku: values.sku.trim(),
    description: values.description.trim() || null,
    category_id: values.category_id,
    is_active: values.is_active,
    is_customizable: values.is_customizable,
    default_price: values.default_price,
    estimated_cost: values.estimated_cost ?? 0,
    stock_mode: values.stock_mode,
    // Stocked products consume materials at production time, never at sale time.
    auto_deduct_materials: values.stock_mode === 'made_to_order' && values.auto_deduct_materials,
    min_stock: values.min_stock ?? 0,
    variants: values.has_variations
      ? values.variants.map((v) => ({
          id: v.id,
          sku: v.sku.trim(),
          price: v.price,
          cost_override: v.cost_override,
          min_stock: v.min_stock ?? 0,
          is_active: v.is_active,
          value_ids: v.valueIds,
        }))
      : [],
  }
}
