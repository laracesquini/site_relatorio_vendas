import { z } from 'zod'
import { todayISO } from '@/lib/format'
import type { CreateSalePayload, SaleLine } from './api'

const required = (message: string) => z.string({ error: message }).min(1, message)
const amount = (message: string) =>
  z.number({ error: message }).min(0, 'Não pode ser negativo')

export const saleFormSchema = z
  .object({
    product_id: required('Selecione o produto'),
    variant_id: required('Selecione a variação'),
    quantity: z
      .number({ error: 'Informe a quantidade' })
      .int('Use um número inteiro')
      .min(1, 'Mínimo 1'),
    channel_id: required('Selecione o canal'),
    sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
    gross_amount: amount('Informe o preço bruto'),
    received_amount: amount('Informe o valor recebido'),
    unit_cost: amount('Informe o custo'),
    is_customized: z.boolean(),
    customization_notes: z.string(),
    notes: z.string(),
  })
  .refine((v) => v.received_amount <= v.gross_amount, {
    path: ['received_amount'],
    message: 'O valor recebido não pode ser maior que o preço bruto',
  })

export type SaleFormValues = z.infer<typeof saleFormSchema>

/** Form state allows empty fields while the user is typing. */
export type SaleFormState = Omit<
  SaleFormValues,
  'product_id' | 'variant_id' | 'channel_id' | 'quantity' | 'gross_amount' | 'received_amount' | 'unit_cost'
> & {
  product_id: string | null
  variant_id: string | null
  channel_id: string | null
  quantity: number | null
  gross_amount: number | null
  received_amount: number | null
  unit_cost: number | null
}

export function emptySaleForm(channelId: string | null, saleDate = todayISO()): SaleFormState {
  return {
    product_id: null,
    variant_id: null,
    quantity: 1,
    channel_id: channelId,
    sale_date: saleDate,
    gross_amount: null,
    received_amount: null,
    unit_cost: null,
    is_customized: false,
    customization_notes: '',
    notes: '',
  }
}

/** Form values for editing a saved (single-item) sale, with its frozen cost. */
export function fromSaleLine(line: SaleLine): SaleFormState {
  return {
    product_id: line.product_id,
    variant_id: line.variant_id,
    quantity: line.quantity,
    channel_id: line.channel_id,
    sale_date: line.sale_date ?? todayISO(),
    gross_amount: line.gross_amount,
    received_amount: line.received_amount,
    unit_cost: line.unit_cost,
    is_customized: Boolean(line.is_customized),
    customization_notes: line.customization_notes ?? '',
    notes: line.notes ?? '',
  }
}

export function toCreateSalePayload(v: SaleFormValues): CreateSalePayload {
  return {
    sale_date: v.sale_date,
    channel_id: v.channel_id,
    received_amount: v.received_amount,
    notes: v.notes.trim() || null,
    items: [
      {
        variant_id: v.variant_id,
        quantity: v.quantity,
        gross_amount: v.gross_amount,
        // The cost shown in the form is the one frozen on the sale.
        unit_cost: v.unit_cost,
        is_customized: v.is_customized,
        customization_notes: v.is_customized ? v.customization_notes.trim() || null : null,
      },
    ],
  }
}
