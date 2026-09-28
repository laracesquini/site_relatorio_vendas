import { useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/Field'
import { purchaseTotal } from '@/domain/stock'
import { useAppMutation } from '@/lib/api'
import { formatCurrency, todayISO } from '@/lib/format'
import { dashboardKeys } from '@/features/dashboard/api'
import { reportKeys } from '@/features/reports/api'
import { inventoryKeys, type InventoryItem } from '@/features/inventory/api'
import { productKeys } from '@/features/products/api'
import { ItemFormDialog } from '@/features/inventory/components/ItemFormDialog'
import type { Category, Supplier } from '@/features/settings/api'
import { purchaseKeys, registerPurchase, updatePurchase } from '../api'
import {
  emptyPurchaseLine,
  purchaseFormSchema,
  toPurchasePayload,
  type PurchaseFormState,
  type PurchaseFormValues,
} from '../schema'
import { PurchaseLineFields } from './PurchaseLineFields'

const NONE = '__none'

type PurchaseFormProps = {
  initial: PurchaseFormState
  /** Id of the purchase being edited; omit to register a new one. */
  purchaseId?: string
  items: InventoryItem[]
  categories: Category[]
  suppliers: Supplier[]
  /** Called after saving, with the purchase date (the list may need to show it). */
  onDone: (purchaseDate: string) => void
}

export function PurchaseForm({ initial, purchaseId, items, categories, suppliers, onDone }: PurchaseFormProps) {
  const form = useForm<PurchaseFormState, unknown, PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema) as unknown as Resolver<PurchaseFormState, unknown, PurchaseFormValues>,
    defaultValues: initial,
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const lines = useWatch({ control: form.control, name: 'items' })
  const total = purchaseTotal(lines?.map((l) => l.total_amount) ?? [])
  const [creatingFor, setCreatingFor] = useState<number | null>(null)

  const save = useAppMutation({
    mutationFn: (v: PurchaseFormValues) =>
      purchaseId ? updatePurchase(purchaseId, toPurchasePayload(v)) : registerPurchase(toPurchasePayload(v)),
    invalidate: [purchaseKeys.all, inventoryKeys.all, dashboardKeys.all, reportKeys.all, productKeys.all],
    successMessage: purchaseId ? 'Compra atualizada' : 'Compra registrada',
    onSuccess: (_, v) => onDone(v.purchase_date),
  })

  const itemsError = form.formState.errors.items?.message ?? form.formState.errors.items?.root?.message

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Data" htmlFor="purchase_date" error={form.formState.errors.purchase_date?.message}>
            <Input id="purchase_date" type="date" max={todayISO()} {...form.register('purchase_date')} />
          </Field>
          <Field label="Fornecedor" htmlFor="supplier">
            <Controller
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                  <SelectTrigger id="supplier" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não informado</SelectItem>
                    {suppliers
                      .filter((s) => !s.archived_at || s.id === field.value)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        {fields.map((f, index) => (
          <PurchaseLineFields
            key={f.id}
            form={form}
            index={index}
            items={items.filter((i) => !i.archived_at || i.id === lines?.[index]?.inventory_item_id)}
            categories={categories}
            showAveragePreview={!purchaseId}
            canRemove={fields.length > 1}
            onRemove={() => remove(index)}
            onCreateItem={() => setCreatingFor(index)}
          />
        ))}
        {itemsError && <p className="text-sm text-danger">{itemsError}</p>}

        <Button type="button" variant="outline" size="sm" onClick={() => append(emptyPurchaseLine())}>
          <Plus /> Adicionar item
        </Button>

        <Field label="Observações" htmlFor="purchase_notes">
          <Textarea id="purchase_notes" rows={2} placeholder="Opcional" {...form.register('notes')} />
        </Field>
      </div>

      <div className="flex flex-col gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="text-sm">
          <span className="text-muted-foreground">Total da compra</span>{' '}
          <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
        </div>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {purchaseId ? 'Salvar alterações' : 'Registrar compra'}
        </Button>
      </div>

      <ItemFormDialog
        open={creatingFor !== null}
        onOpenChange={(open) => !open && setCreatingFor(null)}
        onSaved={(id) => {
          if (creatingFor === null) return
          // Selected once the item list refreshes with the new material.
          form.setValue(`items.${creatingFor}.inventory_item_id`, id)
          form.setValue(`items.${creatingFor}.add_to_stock`, true)
        }}
      />
    </form>
  )
}
