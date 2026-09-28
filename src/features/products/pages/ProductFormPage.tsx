import { useEffect, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { SwitchField } from '@/components/SwitchField'
import { useAppMutation } from '@/lib/api'
import { productKeys, saveProduct } from '../api'
import { GeneralSection, PricingSection, StockSection } from '../components/ProductFormSections'
import { VariationsEditor } from '../components/VariationsEditor'
import { useProduct } from '../hooks'
import type { ProductView } from '../model'
import {
  emptyProductForm,
  productFormSchema,
  toFormValues,
  toSavePayload,
  type ProductFormValues,
} from '../schema'

export default function ProductFormPage() {
  const { id } = useParams()
  const product = useProduct(id)

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/produtos">
          <ArrowLeft /> Produtos
        </Link>
      </Button>
      <PageHeader
        title={id ? 'Editar produto' : 'Novo produto'}
        actions={
          id && (
            <Button asChild variant="outline">
              <Link to={`/produtos/${id}/ficha`}>
                <ClipboardList /> Ficha de custo
              </Link>
            </Button>
          )
        }
      />
      {id && product.isLoading ? (
        <LoadingRows rows={8} />
      ) : id && product.error ? (
        <ErrorState error={product.error} onRetry={product.refetch} />
      ) : (
        <ProductForm key={id ?? 'new'} product={product.data} />
      )}
    </>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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

function ProductForm({ product }: { product?: ProductView }) {
  const navigate = useNavigate()
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? toFormValues(product) : emptyProductForm,
  })

  const hasVariations = useWatch({ control: form.control, name: 'has_variations' })

  const save = useAppMutation({
    mutationFn: (values: ProductFormValues) => saveProduct(toSavePayload(values, product?.id)),
    invalidate: [productKeys.all],
    successMessage: product ? 'Produto atualizado' : 'Produto cadastrado',
    onSuccess: () => navigate('/produtos'),
  })

  // Warn before leaving with unsaved changes (closing/reloading the tab).
  const isDirty = form.formState.isDirty
  useEffect(() => {
    if (!isDirty || save.isSuccess) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, save.isSuccess])

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate className="space-y-4 pb-24">
      <Section title="Informações">
        <GeneralSection form={form} />
      </Section>

      <Section title="Preço e custo" description="Valores padrão. Cada variação pode ter os seus.">
        <PricingSection form={form} defaultVariant={product?.variants.find((v) => v.isDefault)} />
      </Section>

      <Section title="Estoque">
        <StockSection form={form} />
      </Section>

      <Section title="Variações" description="Cor, tamanho, modelo… Cada combinação vira uma variação com SKU próprio.">
        <div className="space-y-4">
          <Controller
            control={form.control}
            name="has_variations"
            render={({ field }) => (
              <SwitchField
                label="Este produto tem variações"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          {hasVariations && (
            <VariationsEditor form={form} saved={product?.variants ?? []} />
          )}
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-7xl justify-end gap-2 px-4 py-3 lg:px-8">
          <Button type="button" variant="outline" onClick={() => navigate('/produtos')} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            Salvar produto
          </Button>
        </div>
      </div>
    </form>
  )
}
