import { useState } from 'react'
import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DecimalInput } from '@/components/DecimalInput'
import { formatDecimalInput } from '@/domain/decimal'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AddVariationValue } from '@/features/settings/components/AddVariationValue'
import { useVariationTypes } from '@/features/settings/hooks'
import type { VariantView } from '../model'
import type { ProductFormValues, VariantFormValues } from '../schema'
import { combine, mergeCombinations, suggestSku, variantLabel, type ValueRef } from '../variants'

type VariationsEditorProps = {
  form: UseFormReturn<ProductFormValues>
  /** Saved variants, for showing their current cost and stock. */
  saved: VariantView[]
}

const COST_SOURCE_LABEL = { override: 'manual', sheet: 'ficha', estimate: 'estimado' } as const

export function VariationsEditor({ form, saved }: VariationsEditorProps) {
  const types = useVariationTypes()
  const { fields, replace, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
    keyName: 'fieldKey',
  })
  const [sku, defaultPrice, stockMode] = useWatch({
    control: form.control,
    name: ['sku', 'default_price', 'stock_mode'],
  })
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(form.getValues('variants').flatMap((v) => v.valueIds)),
  )
  const savedById = new Map(saved.map((v) => [v.id, v]))
  const variantsError = form.formState.errors.variants?.message ?? form.formState.errors.variants?.root?.message

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function generate() {
    const groups: ValueRef[][] = (types.data ?? []).map((t) =>
      t.values.filter((v) => selected.has(v.id)).map((v) => ({ id: v.id, value: v.value, typeId: t.id })),
    )
    const merged = mergeCombinations<VariantFormValues>(
      form.getValues('variants'),
      combine(groups),
      (combo) => ({
        valueIds: combo.map((v) => v.id),
        label: variantLabel(combo.map((v) => v.value)),
        sku: suggestSku(sku, combo.map((v) => v.value)),
        price: null,
        cost_override: null,
        min_stock: null,
        is_active: true,
      }),
    )
    replace(merged)
    form.clearErrors('variants')
  }

  return (
    <div className="space-y-4">
      {types.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum tipo de variação cadastrado.{' '}
          <Link to="/configuracoes?aba=variacoes" className="underline">
            Cadastre em Configurações
          </Link>
          .
        </p>
      )}

      <div className="space-y-3">
        {types.data?.map((t) => (
          <div key={t.id} className="space-y-1.5">
            <p className="text-sm font-medium">{t.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              {t.values.map((v) => {
                const on = selected.has(v.id)
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(v.id)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card hover:bg-accent',
                    )}
                  >
                    {v.value}
                  </button>
                )
              })}
              <AddVariationValue
                typeId={t.id}
                typeName={t.name}
                nested
                onCreated={(value) => setSelected((prev) => new Set(prev).add(value.id))}
              />
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={generate} disabled={selected.size === 0}>
        <Wand2 /> Gerar variações
      </Button>

      {variantsError && <p className="text-sm text-danger">{variantsError}</p>}

      {fields.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variação</TableHead>
                <TableHead className="min-w-44">SKU</TableHead>
                <TableHead className="min-w-32">Preço</TableHead>
                <TableHead className="min-w-32">Custo</TableHead>
                {stockMode === 'stocked' && <TableHead className="min-w-24">Est. mín.</TableHead>}
                <TableHead>Ativa</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const current = field.id ? savedById.get(field.id) : undefined
                const skuError = form.formState.errors.variants?.[index]?.sku?.message
                return (
                  <TableRow key={field.fieldKey}>
                    <TableCell className="font-medium">
                      {field.label}
                      {current && stockMode === 'stocked' && (
                        <div className="text-xs font-normal text-muted-foreground">
                          Em estoque: {current.currentQty}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        {...form.register(`variants.${index}.sku`)}
                        aria-invalid={Boolean(skuError)}
                        aria-label={`SKU de ${field.label}`}
                        className="font-mono text-xs"
                      />
                      {skuError && <p className="mt-1 text-xs text-danger">{skuError}</p>}
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`variants.${index}.price`}
                        render={({ field: f }) => (
                          <DecimalInput
                            value={f.value}
                            onChange={f.onChange}
                            prefix="R$"
                            placeholder={formatDecimalInput(defaultPrice, 2)}
                            aria-label={`Preço de ${field.label}`}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`variants.${index}.cost_override`}
                        render={({ field: f }) => (
                          <DecimalInput
                            value={f.value}
                            onChange={f.onChange}
                            prefix="R$"
                            placeholder="Auto"
                            aria-label={`Custo de ${field.label}`}
                          />
                        )}
                      />
                      {current && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Atual: {formatCurrency(current.unitCost)} ({COST_SOURCE_LABEL[current.costSource]})
                        </p>
                      )}
                    </TableCell>
                    {stockMode === 'stocked' && (
                      <TableCell>
                        <Controller
                          control={form.control}
                          name={`variants.${index}.min_stock`}
                          render={({ field: f }) => (
                            <DecimalInput
                              value={f.value}
                              onChange={f.onChange}
                              fractionDigits="auto"
                              placeholder="0"
                              aria-label={`Estoque mínimo de ${field.label}`}
                            />
                          )}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`variants.${index}.is_active`}
                        render={({ field: f }) => (
                          <Switch
                            checked={f.value}
                            onCheckedChange={f.onChange}
                            aria-label={`${field.label} ativa`}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        aria-label={`Remover ${field.label}`}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {fields.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Preço e custo em branco usam os valores padrão do produto. Variações removidas que já têm vendas
          são arquivadas, não apagadas.
        </p>
      )}
    </div>
  )
}
