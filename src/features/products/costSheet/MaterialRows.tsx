import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DecimalInput } from '@/components/DecimalInput'
import { dec } from '@/domain/decimal'
import { formatCurrency, formatUnitCost } from '@/lib/format'
import type { InventoryItem } from '@/features/inventory/api'
import { emptyMaterialRow, type CostSheetForm, type MaterialRowForm } from './schema'

type MaterialsPath = 'materials' | `variant_sheets.${number}.materials`

type MaterialRowsProps = {
  form: UseFormReturn<CostSheetForm>
  name: MaterialsPath
  items: InventoryItem[]
}

/** Editable list of materials used by one unit of the product (or of one variant). */
export function MaterialRows({ form, name, items }: MaterialRowsProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: name as 'materials' })
  const rows = (useWatch({ control: form.control, name: name as 'materials' }) ?? []) as MaterialRowForm[]
  const byId = new Map(items.map((i) => [i.id, i]))
  const errorsAt = (index: number) => {
    const path = name.split('.').reduce<unknown>(
      (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
      form.formState.errors,
    ) as Array<Record<string, { message?: string }>> | undefined
    return path?.[index]
  }

  return (
    <div className="space-y-2">
      {fields.length > 0 && (
        <div className="hidden grid-cols-[minmax(0,1fr)_8rem_7rem_6rem_2.25rem] gap-2 px-1 text-xs text-muted-foreground sm:grid">
          <span>Insumo</span>
          <span>Quantidade por peça</span>
          <span className="text-right">Custo médio</span>
          <span className="text-right">Custo</span>
          <span />
        </div>
      )}
      {fields.map((field, index) => {
        const row = rows[index]
        const item = row?.inventory_item_id ? byId.get(row.inventory_item_id) : undefined
        const unit = item?.unit?.code
        const lineCost = item && row?.quantity ? dec(row.quantity).times(item.avg_cost).toNumber() : null
        const errors = errorsAt(index)
        return (
          <div
            key={field.id}
            className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_6rem_2.25rem] sm:items-start sm:border-0 sm:p-0"
          >
            <div className="min-w-0">
              <Controller
                control={form.control}
                name={`${name}.${index}.inventory_item_id` as 'materials.0.inventory_item_id'}
                render={({ field: f }) => (
                  <Select value={f.value ?? ''} onValueChange={f.onChange}>
                    <SelectTrigger
                      className="w-full"
                      aria-label={`Insumo da linha ${index + 1}`}
                      aria-invalid={Boolean(errors?.inventory_item_id)}
                    >
                      <SelectValue placeholder="Selecionar insumo" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.unit?.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors?.inventory_item_id && (
                <p className="mt-1 text-xs text-danger">{errors.inventory_item_id.message}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="sm:order-last"
              onClick={() => remove(index)}
              aria-label={`Remover linha ${index + 1}`}
            >
              <Trash2 />
            </Button>
            <div className="col-span-2 grid grid-cols-3 items-center gap-2 sm:col-span-1 sm:contents">
              <div>
                <Controller
                  control={form.control}
                  name={`${name}.${index}.quantity` as 'materials.0.quantity'}
                  render={({ field: f }) => (
                    <DecimalInput
                      fractionDigits="auto"
                      suffix={unit}
                      value={f.value}
                      onChange={f.onChange}
                      aria-label={`Quantidade da linha ${index + 1}`}
                      aria-invalid={Boolean(errors?.quantity)}
                    />
                  )}
                />
                {errors?.quantity && <p className="mt-1 text-xs text-danger">{errors.quantity.message}</p>}
              </div>
              <span className="text-right text-sm tabular-nums text-muted-foreground sm:pt-2">
                {item ? `${formatUnitCost(item.avg_cost)}/${unit}` : '—'}
              </span>
              <span className="text-right text-sm font-medium tabular-nums sm:pt-2">{formatCurrency(lineCost)}</span>
            </div>
          </div>
        )
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => append(emptyMaterialRow())}>
        <Plus /> Adicionar insumo
      </Button>
    </div>
  )
}
