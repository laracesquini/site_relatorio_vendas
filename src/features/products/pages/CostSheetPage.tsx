import { useEffect, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { SwitchField } from '@/components/SwitchField'
import { useAppMutation } from '@/lib/api'
import { dashboardKeys } from '@/features/dashboard/api'
import type { InventoryItem } from '@/features/inventory/api'
import { useInventoryItems } from '@/features/inventory/hooks'
import { productKeys } from '../api'
import { saveCostSheet, useCostSheet, type CostSheet } from '../costSheet/api'
import { CostSummary } from '../costSheet/CostSummary'
import { ExtraCostRows } from '../costSheet/ExtraCostRows'
import { MaterialRows } from '../costSheet/MaterialRows'
import { costSheetSchema, toCostSheetForm, toSaveCostSheetPayload, type CostSheetForm } from '../costSheet/schema'
import { useProduct } from '../hooks'
import type { ProductView } from '../model'

export default function CostSheetPage() {
  const { id } = useParams()
  const product = useProduct(id)
  const sheet = useCostSheet(id)
  const items = useInventoryItems()
  const queries = [product, sheet, items]

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to={id ? `/produtos/${id}` : '/produtos'}>
          <ArrowLeft /> {product.data?.name ?? 'Produto'}
        </Link>
      </Button>
      <PageHeader
        title="Ficha de custo"
        description="Quanto de cada insumo uma peça usa. O custo de produção é calculado pelo custo médio atual dos insumos."
      />
      {queries.some((q) => q.isLoading) ? (
        <LoadingRows rows={8} />
      ) : queries.some((q) => q.error) ? (
        <ErrorState error={queries.find((q) => q.error)?.error} onRetry={() => queries.forEach((q) => q.refetch())} />
      ) : product.data && sheet.data ? (
        <CostSheetEditor product={product.data} sheet={sheet.data} items={items.data ?? []} />
      ) : null}
    </>
  )
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function CostSheetEditor({ product, sheet, items }: { product: ProductView; sheet: CostSheet; items: InventoryItem[] }) {
  const navigate = useNavigate()
  const form = useForm<CostSheetForm>({
    resolver: zodResolver(costSheetSchema),
    defaultValues: toCostSheetForm(sheet, product.variants),
  })
  const variantSheets = useFieldArray({ control: form.control, name: 'variant_sheets' })
  const values = useWatch({ control: form.control }) as CostSheetForm
  const selectable = items.filter((i) => !i.archived_at || sheet.materials.some((m) => m.inventoryItemId === i.id))
  const variantsById = new Map(product.variants.map((v) => [v.id, v]))

  const save = useAppMutation({
    mutationFn: (v: CostSheetForm) => saveCostSheet(product.id, toSaveCostSheetPayload(v)),
    invalidate: [productKeys.all, dashboardKeys.all],
    successMessage: 'Ficha de custo salva',
    onSuccess: () => navigate(`/produtos/${product.id}`),
  })

  const isDirty = form.formState.isDirty
  useEffect(() => {
    if (!isDirty || save.isSuccess) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, save.isSuccess])

  const deduction =
    product.stockMode === 'stocked'
      ? 'Estoque pronto: estes insumos são baixados ao registrar a produção.'
      : product.auto_deduct_materials
        ? 'Sob encomenda com baixa automática: estes insumos são baixados a cada venda.'
        : 'A baixa automática de insumos está desligada para este produto; a ficha só calcula o custo.'

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4 pb-24">
      <Section
        title={product.hasVariations ? 'Insumos (todas as variações)' : 'Insumos por peça'}
        description={
          <>
            {deduction}{' '}
            <Link to={`/produtos/${product.id}`} className="underline underline-offset-2">
              Alterar no produto
            </Link>
          </>
        }
      >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum insumo cadastrado.{' '}
            <Link to="/estoque" className="underline underline-offset-2">
              Cadastre em Estoque
            </Link>{' '}
            para montar a ficha.
          </p>
        ) : (
          <MaterialRows form={form} name="materials" items={selectable} />
        )}
      </Section>

      <Section title="Custos adicionais por peça" description="Valem para todas as variações.">
        <ExtraCostRows form={form} />
      </Section>

      {variantSheets.fields.length > 0 && (
        <Section
          title="Fichas por variação"
          description="Use quando uma variação gasta insumos diferentes (ex.: tamanho grande usa mais filamento). A ficha própria substitui a lista de insumos do produto; os custos adicionais continuam valendo."
        >
          <div className="space-y-3">
            {variantSheets.fields.map((field, index) => {
              const variant = variantsById.get(field.variant_id)
              const enabled = values.variant_sheets?.[index]?.enabled
              return (
                <div key={field.id} className="space-y-3">
                  <Controller
                    control={form.control}
                    name={`variant_sheets.${index}.enabled`}
                    render={({ field: f }) => (
                      <SwitchField
                        label={`${variant?.label ?? ''} · ficha própria`}
                        hint={f.value ? undefined : 'Usa a ficha do produto.'}
                        checked={f.value}
                        onCheckedChange={(on) => {
                          f.onChange(on)
                          // Start from the product sheet, the usual starting point.
                          if (on && form.getValues(`variant_sheets.${index}.materials`).length === 0) {
                            form.setValue(`variant_sheets.${index}.materials`, form.getValues('materials'))
                          }
                        }}
                      />
                    )}
                  />
                  {enabled && (
                    <div className="pl-3 sm:pl-6">
                      <MaterialRows form={form} name={`variant_sheets.${index}.materials`} items={selectable} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      <Section title="Custo por peça">
        <CostSummary values={values} variants={product.variants} items={items} />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-7xl justify-end gap-2 px-4 py-3 lg:px-8">
          <Button type="button" variant="outline" onClick={() => navigate(`/produtos/${product.id}`)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            Salvar ficha
          </Button>
        </div>
      </div>
    </form>
  )
}
