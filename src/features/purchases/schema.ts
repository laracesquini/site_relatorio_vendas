import { z } from 'zod'
import { todayISO } from '@/lib/format'
import type { PurchaseLine, PurchasePayload } from './api'

// All line checks live in one refinement so every error shows at once (zod
// skips refinements on an object whose fields already failed).
export const purchaseLineSchema = z
  .object({
    inventory_item_id: z.string().nullable(),
    description: z.string(),
    category_id: z.string().nullable(),
    quantity: z.number().nullable(),
    total_amount: z.number().nullable(),
    add_to_stock: z.boolean(),
    stock_qty_per_unit: z.number().nullable(),
  })
  .superRefine((line, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (!line.inventory_item_id && !line.description.trim()) {
      issue('description', 'Descreva o item ou escolha um insumo')
    }
    if (line.quantity === null) issue('quantity', 'Informe a quantidade')
    else if (line.quantity <= 0) issue('quantity', 'Deve ser maior que zero')
    if (line.total_amount === null) issue('total_amount', 'Informe o valor')
    else if (line.total_amount < 0) issue('total_amount', 'Não pode ser negativo')
    if (line.stock_qty_per_unit !== null && line.stock_qty_per_unit <= 0) {
      issue('stock_qty_per_unit', 'Deve ser maior que zero')
    }
  })
  .transform((line) => ({ ...line, quantity: line.quantity!, total_amount: line.total_amount! }))

export const purchaseFormSchema = z.object({
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
  supplier_id: z.string().nullable(),
  notes: z.string(),
  items: z.array(purchaseLineSchema).min(1, 'Adicione pelo menos um item'),
})

/** Validated values (amounts present). */
export type PurchaseFormValues = z.output<typeof purchaseFormSchema>
/** Form state: amounts may be empty while typing. */
export type PurchaseFormState = z.input<typeof purchaseFormSchema>
export type PurchaseLineState = PurchaseFormState['items'][number]

export const emptyPurchaseLine = (): PurchaseLineState => ({
  inventory_item_id: null,
  description: '',
  category_id: null,
  quantity: 1,
  total_amount: null,
  add_to_stock: false,
  stock_qty_per_unit: null,
})

export const emptyPurchaseForm = (): PurchaseFormState => ({
  purchase_date: todayISO(),
  supplier_id: null,
  notes: '',
  items: [emptyPurchaseLine()],
})

/** Form values for editing a saved purchase from its lines. */
export function fromPurchaseLines(lines: PurchaseLine[]): PurchaseFormState {
  const first = lines[0]
  return {
    purchase_date: first?.purchase_date ?? todayISO(),
    supplier_id: first?.supplier_id ?? null,
    notes: first?.purchase_notes ?? '',
    items: lines.map((l) => ({
      inventory_item_id: l.inventory_item_id,
      // A line tied to a material keeps its own description only if it differs.
      description: l.inventory_item_id && l.description === l.inventory_item_name ? '' : (l.description ?? ''),
      category_id: l.category_id,
      quantity: l.quantity,
      total_amount: l.total_amount,
      add_to_stock: Boolean(l.add_to_stock),
      stock_qty_per_unit: l.stock_qty_per_unit === 1 ? null : l.stock_qty_per_unit,
    })),
  }
}

export function toPurchasePayload(v: PurchaseFormValues): PurchasePayload {
  return {
    purchase_date: v.purchase_date,
    supplier_id: v.supplier_id,
    notes: v.notes.trim() || null,
    items: v.items.map((l) => {
      const toStock = Boolean(l.inventory_item_id) && l.add_to_stock
      return {
        // Empty description: the database uses the material's name.
        description: l.description.trim() || null,
        category_id: l.category_id,
        inventory_item_id: l.inventory_item_id,
        quantity: l.quantity,
        total_amount: l.total_amount,
        add_to_stock: toStock,
        stock_qty_per_unit: toStock ? (l.stock_qty_per_unit ?? 1) : 1,
      }
    }),
  }
}
