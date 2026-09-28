import { useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DecimalInput } from '@/components/DecimalInput'
import { Field } from '@/components/Field'
import { SwitchField } from '@/components/SwitchField'
import { calculateSale } from '@/domain/sale'
import { dec, roundMoney } from '@/domain/decimal'
import { useAppMutation } from '@/lib/api'
import { formatCurrency, formatPercent } from '@/lib/format'
import { dashboardKeys } from '@/features/dashboard/api'
import { reportKeys } from '@/features/reports/api'
import { inventoryKeys } from '@/features/inventory/api'
import { productKeys } from '@/features/products/api'
import { MaterialsPreview } from '@/features/products/costSheet/MaterialsPreview'
import type { ProductView, VariantView } from '@/features/products/model'
import type { Channel } from '@/features/settings/api'
import { createSale, salesKeys, updateSale, type SaleLine } from '../api'
import { storeLastChannel } from '../lastChannel'
import {
  emptySaleForm,
  fromSaleLine,
  saleFormSchema,
  toCreateSalePayload,
  type SaleFormState,
  type SaleFormValues,
} from '../schema'
import { ProductPicker } from './ProductPicker'
import { SaleSummaryCard } from './SaleSummaryCard'

type SaleFormProps = {
  products: ProductView[]
  recentProductIds: string[]
  channels: Channel[]
  initialChannelId: string | null
  /** The sale being edited; omit to register a new one. */
  editing?: SaleLine
  onDone: () => void
}

const COST_SOURCE_HINT = {
  override: 'custo definido na variação',
  sheet: 'calculado pela ficha de custo',
  estimate: 'custo estimado do produto',
} as const

export function SaleForm({
  products,
  recentProductIds,
  channels,
  initialChannelId,
  editing,
  onDone,
}: SaleFormProps) {
  const form = useForm<SaleFormState, unknown, SaleFormValues>({
    resolver: zodResolver(saleFormSchema) as unknown as Resolver<SaleFormState, unknown, SaleFormValues>,
    defaultValues: editing ? fromSaleLine(editing) : emptySaleForm(initialChannelId),
  })
  const { errors } = form.formState
  const pickerRef = useRef<HTMLButtonElement>(null)
  const submitMode = useRef<'close' | 'another'>('close')
  // Once the user types a gross price (or edits a saved sale), stop
  // recalculating it from price × quantity.
  const [grossTouched, setGrossTouched] = useState(Boolean(editing))

  const values = useWatch({ control: form.control })
  const product = products.find((p) => p.id === values.product_id)
  // The sale's own variant stays selectable even if it was deactivated since.
  const activeVariants = useMemo(
    () => product?.variants.filter((v) => v.isActive || v.id === editing?.variant_id) ?? [],
    [product, editing?.variant_id],
  )
  const variant = activeVariants.find((v) => v.id === values.variant_id)
  const summary = calculateSale({
    gross: values.gross_amount,
    received: values.received_amount,
    unitCost: values.unit_cost,
    quantity: values.quantity,
  })
  const quantity = values.quantity ?? 0
  const insufficientStock =
    product?.stockMode === 'stocked' && variant !== undefined && quantity > variant.currentQty

  const save = useAppMutation({
    mutationFn: (v: SaleFormValues) =>
      editing ? updateSale(editing.sale_id!, toCreateSalePayload(v)) : createSale(toCreateSalePayload(v)),
    invalidate: [salesKeys.all, productKeys.all, dashboardKeys.all, reportKeys.all, inventoryKeys.all],
    successMessage: editing ? 'Venda atualizada' : 'Venda registrada',
    onSuccess: (_, v) => {
      if (!editing) storeLastChannel(v.channel_id)
      if (editing || submitMode.current === 'close') {
        onDone()
        return
      }
      // Keep channel and date: consecutive sales usually share them.
      form.reset(emptySaleForm(v.channel_id, v.sale_date))
      setGrossTouched(false)
      requestAnimationFrame(() => pickerRef.current?.focus())
    },
  })

  function applyVariant(v: VariantView | undefined, qty: number | null, touched = grossTouched) {
    form.setValue('variant_id', v?.id ?? null, { shouldValidate: form.formState.isSubmitted })
    form.setValue('unit_cost', v ? v.unitCost : null)
    if (!touched) {
      form.setValue('gross_amount', v ? roundMoney(dec(v.price).times(qty ?? 1)) : null)
    }
  }

  function selectProduct(productId: string) {
    const p = products.find((x) => x.id === productId)
    form.setValue('product_id', productId, { shouldValidate: form.formState.isSubmitted })
    form.setValue('is_customized', Boolean(p?.is_customizable))
    setGrossTouched(false)
    const variants = p?.variants.filter((v) => v.isActive) ?? []
    applyVariant(variants.length === 1 ? variants[0] : undefined, form.getValues('quantity'), false)
  }

  const submit = form.handleSubmit((v) => save.mutate(v))

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
        <Field label="Produto" htmlFor="product" error={errors.product_id?.message}>
          <ProductPicker
            id="product"
            ref={pickerRef}
            products={products}
            recentIds={recentProductIds}
            value={values.product_id ?? null}
            onChange={selectProduct}
            invalid={Boolean(errors.product_id)}
          />
        </Field>

        {product?.hasVariations && (
          <Field label="Variação" htmlFor="variant" error={errors.variant_id?.message}>
            <Select
              value={values.variant_id ?? ''}
              onValueChange={(id) => applyVariant(activeVariants.find((v) => v.id === id), quantity)}
            >
              <SelectTrigger id="variant" className="w-full" aria-invalid={Boolean(errors.variant_id)}>
                <SelectValue placeholder="Selecionar cor, tamanho…" />
              </SelectTrigger>
              <SelectContent>
                {activeVariants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{v.sku}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantidade" htmlFor="quantity" error={errors.quantity?.message}>
            <Controller
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const qty = e.target.value === '' ? null : Number(e.target.value)
                    field.onChange(qty)
                    if (variant && !grossTouched) {
                      form.setValue('gross_amount', roundMoney(dec(variant.price).times(qty ?? 0)))
                    }
                  }}
                />
              )}
            />
          </Field>
          <Field label="Data" htmlFor="sale_date" error={errors.sale_date?.message}>
            <Input id="sale_date" type="date" {...form.register('sale_date')} />
          </Field>
        </div>

        <Field label="Canal" htmlFor="channel" error={errors.channel_id?.message}>
          <Controller
            control={form.control}
            name="channel_id"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="channel" className="w-full" aria-invalid={Boolean(errors.channel_id)}>
                  <SelectValue placeholder="Selecionar canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Preço bruto" htmlFor="gross" error={errors.gross_amount?.message} hint="Pago pelo cliente">
            <Controller
              control={form.control}
              name="gross_amount"
              render={({ field }) => (
                <DecimalInput
                  id="gross"
                  prefix="R$"
                  value={field.value}
                  onChange={(v) => {
                    setGrossTouched(true)
                    field.onChange(v)
                  }}
                  aria-invalid={Boolean(errors.gross_amount)}
                />
              )}
            />
          </Field>
          <Field
            label="Valor recebido"
            htmlFor="received"
            error={errors.received_amount?.message}
            hint={
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() =>
                  form.setValue('received_amount', values.gross_amount ?? null, {
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
              >
                Igual ao bruto (sem taxas)
              </button>
            }
          >
            <Controller
              control={form.control}
              name="received_amount"
              render={({ field }) => (
                <DecimalInput
                  id="received"
                  prefix="R$"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={Boolean(errors.received_amount) || summary.receivedExceedsGross}
                />
              )}
            />
          </Field>
        </div>

        <Field
          label="Custo unitário de produção"
          htmlFor="unit_cost"
          error={errors.unit_cost?.message}
          hint={
            editing && variant?.id === editing.variant_id
              ? 'Custo registrado na venda. Mudanças posteriores no produto não o alteram.'
              : variant
                ? `Carregado do ${COST_SOURCE_HINT[variant.costSource]}; ajuste se esta peça saiu diferente.`
                : undefined
          }
        >
          <Controller
            control={form.control}
            name="unit_cost"
            render={({ field }) => (
              <DecimalInput
                id="unit_cost"
                prefix="R$"
                fractionDigits={2}
                value={field.value}
                onChange={field.onChange}
                containerClassName="sm:max-w-48"
              />
            )}
          />
        </Field>

        {insufficientStock && (
          <p className="flex items-start gap-2 rounded-lg bg-soft-warning p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            Só há {variant.currentQty} un. prontas desta variação. A venda será registrada e o estoque ficará negativo.
          </p>
        )}

        {product && variant && product.stockMode === 'made_to_order' && product.auto_deduct_materials && (
          <MaterialsPreview
            productId={product.id}
            variantId={variant.id}
            units={quantity}
            title={editing ? 'Insumos baixados com os novos valores' : 'Insumos que serão baixados'}
          />
        )}

        <Controller
          control={form.control}
          name="is_customized"
          render={({ field }) => (
            <SwitchField label="Personalizado" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        {values.is_customized && (
          <Field label="Personalização" htmlFor="customization">
            <Textarea
              id="customization"
              rows={2}
              placeholder={'Ex.: Nome: Mel\nTelefone: (11) 91234-5678'}
              {...form.register('customization_notes')}
            />
          </Field>
        )}

        <Field label="Observações" htmlFor="notes">
          <Textarea id="notes" rows={2} placeholder="Opcional" {...form.register('notes')} />
        </Field>

        <SaleSummaryCard summary={summary} />
      </div>

      <div className="border-t bg-background px-4 py-3 sm:px-6">
        <div className="mb-2 flex items-center justify-between text-sm sm:hidden">
          <span className="text-muted-foreground">Lucro</span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(summary.profit)} · {formatPercent(summary.margin)}
          </span>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!editing && (
            <Button
              type="submit"
              variant="outline"
              disabled={save.isPending}
              onClick={() => (submitMode.current = 'another')}
            >
              Salvar e registrar outra
            </Button>
          )}
          <Button type="submit" disabled={save.isPending} onClick={() => (submitMode.current = 'close')}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {editing ? 'Salvar alterações' : 'Salvar venda'}
          </Button>
        </div>
      </div>
    </form>
  )
}
