import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DecimalInput } from '@/components/DecimalInput'
import { Field } from '@/components/Field'
import { SwitchField } from '@/components/SwitchField'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCategoryOptions } from '@/features/settings/hooks'
import type { VariantView } from '../model'
import type { ProductFormValues } from '../schema'

type SectionProps = { form: UseFormReturn<ProductFormValues> }

const NO_CATEGORY = '__none'

export function GeneralSection({ form }: SectionProps) {
  const categories = useCategoryOptions('product')
  const { errors } = form.formState

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
        <Input id="name" {...form.register('name')} aria-invalid={Boolean(errors.name)} />
      </Field>
      <Field label="SKU" htmlFor="sku" error={errors.sku?.message} hint="Código único do produto.">
        <Input id="sku" {...form.register('sku')} className="font-mono" aria-invalid={Boolean(errors.sku)} />
      </Field>
      <Field label="Categoria" htmlFor="category">
        <Controller
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <Select
              value={field.value ?? NO_CATEGORY}
              onValueChange={(v) => field.onChange(v === NO_CATEGORY ? null : v)}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                {categories.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Descrição" htmlFor="description" className="sm:col-span-2">
        <Textarea id="description" rows={2} {...form.register('description')} />
      </Field>
      <Controller
        control={form.control}
        name="is_active"
        render={({ field }) => (
          <SwitchField
            label="Ativo"
            hint="Produtos inativos não aparecem ao registrar vendas."
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="is_customizable"
        render={({ field }) => (
          <SwitchField
            label="Personalizável"
            hint="Permite anotar a personalização (nome, telefone…) na venda."
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
    </div>
  )
}

export function PricingSection({ form, defaultVariant }: SectionProps & { defaultVariant?: VariantView }) {
  const { errors } = form.formState
  const hasVariations = useWatch({ control: form.control, name: 'has_variations' })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Preço de venda padrão" htmlFor="default_price" error={errors.default_price?.message}>
        <Controller
          control={form.control}
          name="default_price"
          render={({ field }) => (
            <DecimalInput
              id="default_price"
              prefix="R$"
              value={field.value}
              onChange={(v) => field.onChange(v ?? 0)}
            />
          )}
        />
      </Field>
      <Field
        label="Custo de produção estimado"
        htmlFor="estimated_cost"
        error={errors.estimated_cost?.message}
        hint={
          defaultVariant && !hasVariations && defaultVariant.costSource === 'sheet'
            ? `A ficha de custo define o custo atual: ${formatCurrency(defaultVariant.unitCost)}.`
            : 'Usado quando o produto não tem ficha de custo.'
        }
      >
        <Controller
          control={form.control}
          name="estimated_cost"
          render={({ field }) => (
            <DecimalInput
              id="estimated_cost"
              prefix="R$"
              fractionDigits={2}
              value={field.value}
              onChange={field.onChange}
              placeholder="0,00"
            />
          )}
        />
      </Field>
    </div>
  )
}

const STOCK_MODES = [
  {
    value: 'made_to_order',
    title: 'Sob encomenda',
    description: 'Produzido depois da venda. A venda pode baixar os insumos da ficha de custo.',
  },
  {
    value: 'stocked',
    title: 'Estoque pronto',
    description: 'Produzido antes. A produção baixa os insumos e a venda baixa as unidades prontas.',
  },
] as const

export function StockSection({ form }: SectionProps) {
  const [stockMode, hasVariations] = useWatch({
    control: form.control,
    name: ['stock_mode', 'has_variations'],
  })

  return (
    <div className="space-y-4">
      <Controller
        control={form.control}
        name="stock_mode"
        render={({ field }) => (
          <div role="radiogroup" aria-label="Controle de estoque" className="grid gap-3 sm:grid-cols-2">
            {STOCK_MODES.map((mode) => {
              const on = field.value === mode.value
              return (
                <button
                  key={mode.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => field.onChange(mode.value)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    on ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent/50',
                  )}
                >
                  <span className="block text-sm font-medium">{mode.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{mode.description}</span>
                </button>
              )
            })}
          </div>
        )}
      />

      {stockMode === 'made_to_order' ? (
        <Controller
          control={form.control}
          name="auto_deduct_materials"
          render={({ field }) => (
            <SwitchField
              label="Baixar insumos automaticamente ao registrar venda"
              hint="Usa as quantidades da ficha de custo do produto (filamento, argolas, embalagem…)."
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      ) : (
        !hasVariations && (
          <Field label="Estoque mínimo" htmlFor="min_stock" hint="Abaixo disso o produto aparece como estoque baixo.">
            <Controller
              control={form.control}
              name="min_stock"
              render={({ field }) => (
                <DecimalInput
                  id="min_stock"
                  fractionDigits="auto"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0"
                  containerClassName="sm:max-w-40"
                />
              )}
            />
          </Field>
        )
      )}
    </div>
  )
}
