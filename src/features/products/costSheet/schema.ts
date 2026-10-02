import { z } from 'zod'
import type { VariantView } from '../model'
import type { CostSheet, SaveCostSheetPayload } from './api'

const materialRow = z.object({
  inventory_item_id: z.string().nullable(),
  quantity: z.number().nullable(),
})

const extraRow = z.object({
  label: z.string(),
  amount: z.number().nullable(),
})

// Every check in one refinement, so all errors show at once.
export const costSheetSchema = z
  .object({
    materials: z.array(materialRow),
    extras: z.array(extraRow),
    variant_sheets: z.array(
      z.object({ variant_id: z.string(), enabled: z.boolean(), materials: z.array(materialRow) }),
    ),
  })
  .superRefine((v, ctx) => {
    const checkMaterials = (rows: z.infer<typeof materialRow>[], base: (string | number)[]) => {
      const seen = new Set<string>()
      rows.forEach((r, i) => {
        if (!r.inventory_item_id) {
          ctx.addIssue({ code: 'custom', path: [...base, i, 'inventory_item_id'], message: 'Selecione o insumo' })
        } else if (seen.has(r.inventory_item_id)) {
          ctx.addIssue({ code: 'custom', path: [...base, i, 'inventory_item_id'], message: 'Insumo repetido' })
        } else {
          seen.add(r.inventory_item_id)
        }
        if (r.quantity === null || r.quantity <= 0) {
          ctx.addIssue({ code: 'custom', path: [...base, i, 'quantity'], message: 'Maior que zero' })
        }
      })
    }
    checkMaterials(v.materials, ['materials'])
    v.variant_sheets.forEach((s, i) => {
      if (s.enabled) checkMaterials(s.materials, ['variant_sheets', i, 'materials'])
    })
    v.extras.forEach((e, i) => {
      if (!e.label.trim()) ctx.addIssue({ code: 'custom', path: ['extras', i, 'label'], message: 'Dê um nome' })
      if (e.amount === null) ctx.addIssue({ code: 'custom', path: ['extras', i, 'amount'], message: 'Informe o valor' })
      else if (e.amount < 0) ctx.addIssue({ code: 'custom', path: ['extras', i, 'amount'], message: 'Não pode ser negativo' })
    })
  })

export type CostSheetForm = z.infer<typeof costSheetSchema>
export type MaterialRowForm = z.infer<typeof materialRow>

export const emptyMaterialRow = (): MaterialRowForm => ({ inventory_item_id: null, quantity: null })

/** Form values from the saved sheet; every non-default variant gets a (possibly off) own sheet. */
export function toCostSheetForm(sheet: CostSheet, variants: VariantView[]): CostSheetForm {
  const productRows = sheet.materials
    .filter((m) => m.variantId === null)
    .map((m) => ({ inventory_item_id: m.inventoryItemId, quantity: m.quantity }))
  return {
    materials: productRows,
    extras: sheet.extras.map((e) => ({ label: e.label, amount: e.amount })),
    variant_sheets: variants
      .filter((v) => !v.isDefault)
      .map((v) => {
        const own = sheet.materials.filter((m) => m.variantId === v.id)
        return {
          variant_id: v.id,
          enabled: own.length > 0,
          materials: own.map((m) => ({ inventory_item_id: m.inventoryItemId, quantity: m.quantity })),
        }
      }),
  }
}

export function toSaveCostSheetPayload(form: CostSheetForm): SaveCostSheetPayload {
  const rows = (materials: MaterialRowForm[], variantId: string | null) =>
    materials.map((m) => ({ inventory_item_id: m.inventory_item_id!, quantity: m.quantity!, variant_id: variantId }))
  return {
    materials: [
      ...rows(form.materials, null),
      // A variant sheet switched off (or left empty) falls back to the product sheet.
      ...form.variant_sheets.filter((s) => s.enabled).flatMap((s) => rows(s.materials, s.variant_id)),
    ],
    extra_costs: form.extras.map((e) => ({ label: e.label.trim(), amount: e.amount! })),
  }
}
