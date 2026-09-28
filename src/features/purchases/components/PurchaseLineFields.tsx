import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DecimalInput } from '@/components/DecimalInput'
import { Field } from '@/components/Field'
import { SwitchField } from '@/components/SwitchField'
import { averageAfterEntry, calculatePurchaseLine } from '@/domain/stock'
import { formatQuantity, formatUnitCost } from '@/lib/format'
import type { InventoryItem } from '@/features/inventory/api'
import type { Category } from '@/features/settings/api'
import type { PurchaseFormState } from '../schema'

const NONE = '__none'

type PurchaseLineFieldsProps = {
  form: UseFormReturn<PurchaseFormState>
  index: number
  items: InventoryItem[]
  categories: Category[]
  /** When editing, the current average already includes this purchase. */
  showAveragePreview: boolean
  canRemove: boolean
  onRemove: () => void
  onCreateItem: () => void
}

export function PurchaseLineFields({
  form,
  index,
  items,
  categories,
  showAveragePreview,
  canRemove,
  onRemove,
  onCreateItem,
}: PurchaseLineFieldsProps) {
  const line = useWatch({ control: form.control, name: `items.${index}` })
  const errors = form.formState.errors.items?.[index]
  const item = items.find((i) => i.id === line?.inventory_item_id)
  const unit = item?.unit?.code ?? ''
  const calc = calculatePurchaseLine({
    quantity: line?.quantity,
    totalAmount: line?.total_amount,
    stockQtyPerUnit: line?.add_to_stock ? line.stock_qty_per_unit : 1,
  })
  const materialCategories = categories.filter((c) => c.kind === 'material')
  const expenseCategories = categories.filter((c) => c.kind === 'expense')

  function selectItem(id: string | null) {
    const chosen = items.find((i) => i.id === id)
    form.setValue(`items.${index}.inventory_item_id`, id)
    form.setValue(`items.${index}.add_to_stock`, Boolean(chosen))
    if (chosen?.category_id) form.setValue(`items.${index}.category_id`, chosen.category_id)
  }

  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <legend className="text-sm font-medium">Item {index + 1}</legend>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remover item ${index + 1}`}>
            <Trash2 />
          </Button>
        )}
      </div>

      <Field label="Insumo do estoque" htmlFor={`item-${index}`} hint={!item ? 'Deixe em "Despesa" para gastos que não entram no estoque.' : undefined}>
        <div className="flex gap-2">
          <Select value={line?.inventory_item_id ?? NONE} onValueChange={(v) => selectItem(v === NONE ? null : v)}>
            <SelectTrigger id={`item-${index}`} className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Despesa (não entra no estoque)</SelectItem>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name} ({i.unit?.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" onClick={onCreateItem} aria-label="Cadastrar novo insumo">
            <Plus />
          </Button>
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={item ? 'Descrição (opcional)' : 'Descrição'}
          htmlFor={`desc-${index}`}
          error={errors?.description?.message}
        >
          <Input
            id={`desc-${index}`}
            placeholder={item ? item.name : 'Ex.: Anúncio Shopee, frete…'}
            {...form.register(`items.${index}.description`)}
          />
        </Field>
        <Field label="Categoria" htmlFor={`cat-${index}`}>
          <Controller
            control={form.control}
            name={`items.${index}.category_id`}
            render={({ field }) => (
              <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                <SelectTrigger id={`cat-${index}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem categoria</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Insumos</SelectLabel>
                    {materialCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Despesas</SelectLabel>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.is_operational ? ' (operacional)' : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Quantidade" htmlFor={`qty-${index}`} error={errors?.quantity?.message}>
          <Controller
            control={form.control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <DecimalInput id={`qty-${index}`} fractionDigits="auto" value={field.value} onChange={field.onChange} />
            )}
          />
        </Field>
        <Field label="Valor total" htmlFor={`total-${index}`} error={errors?.total_amount?.message}>
          <Controller
            control={form.control}
            name={`items.${index}.total_amount`}
            render={({ field }) => (
              <DecimalInput id={`total-${index}`} prefix="R$" value={field.value} onChange={field.onChange} />
            )}
          />
        </Field>
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <span className="text-sm font-medium">Preço unitário</span>
          <p className="flex h-9 items-center text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {formatUnitCost(calc.unitPrice)}
          </p>
        </div>
      </div>

      {item && (
        <Controller
          control={form.control}
          name={`items.${index}.add_to_stock`}
          render={({ field }) => (
            <SwitchField
              label="Adicionar esta compra ao estoque"
              hint="Registra a entrada e atualiza o custo médio do insumo."
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      )}

      {item && line?.add_to_stock && (
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <Field
            label={`Cada unidade comprada equivale a quantos ${unit}?`}
            htmlFor={`factor-${index}`}
            error={errors?.stock_qty_per_unit?.message}
            hint={unit === 'g' ? 'Ex.: 1 rolo de 1 kg = 1000 g.' : 'Deixe em branco se a compra já é na mesma unidade.'}
          >
            <Controller
              control={form.control}
              name={`items.${index}.stock_qty_per_unit`}
              render={({ field }) => (
                <DecimalInput
                  id={`factor-${index}`}
                  fractionDigits="auto"
                  suffix={unit}
                  placeholder="1"
                  value={field.value}
                  onChange={field.onChange}
                  containerClassName="sm:max-w-40"
                />
              )}
            />
          </Field>
          {calc.stockQuantity !== null && calc.stockUnitCost !== null && (
            <p className="text-sm" aria-live="polite">
              Entram <span className="font-medium tabular-nums">{formatQuantity(calc.stockQuantity, unit)}</span> a{' '}
              <span className="font-medium tabular-nums">
                {formatUnitCost(calc.stockUnitCost)}/{unit}
              </span>
              {showAveragePreview && (
                <span className="block text-xs text-muted-foreground">
                  Custo médio: {formatUnitCost(item.avg_cost)} →{' '}
                  {formatUnitCost(averageAfterEntry(item.current_qty, item.avg_cost, calc.stockQuantity, calc.stockUnitCost))}
                  /{unit}
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}
