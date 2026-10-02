import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { useAppMutation } from '@/lib/api'
import { useCategoryOptions } from '@/features/settings/hooks'
import { deleteProduct, productKeys, setProductArchived } from '../api'
import { ProductsTable } from '../components/ProductsTable'
import { useProducts } from '../hooks'
import type { ProductView } from '../model'

type StatusFilter = 'active' | 'inactive' | 'archived' | 'all'
const ALL = '__all'

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function ProductsPage() {
  const navigate = useNavigate()
  const products = useProducts()
  const categories = useCategoryOptions('product')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [status, setStatus] = useState<StatusFilter>('active')
  const [deleting, setDeleting] = useState<ProductView | null>(null)

  const archive = useAppMutation({
    mutationFn: (p: ProductView) => setProductArchived(p.id, !p.archived_at),
    invalidate: [productKeys.all],
    successMessage: (_, p) => (p.archived_at ? 'Produto restaurado' : 'Produto arquivado'),
  })
  const remove = useAppMutation({
    mutationFn: (p: ProductView) => deleteProduct(p.id),
    invalidate: [productKeys.all],
    successMessage: 'Produto excluído',
    onSuccess: () => setDeleting(null),
  })

  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    return (products.data ?? []).filter((p) => {
      if (status === 'active' && (p.archived_at || !p.is_active)) return false
      if (status === 'inactive' && (p.archived_at || p.is_active)) return false
      if (status === 'archived' && !p.archived_at) return false
      if (category !== ALL && p.category_id !== category) return false
      if (!term) return true
      return (
        normalize(p.name).includes(term) ||
        normalize(p.sku).includes(term) ||
        p.variants.some((v) => normalize(v.sku).includes(term) || normalize(v.label).includes(term))
      )
    })
  }, [products.data, search, category, status])

  const hasProducts = (products.data?.length ?? 0) > 0

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Catálogo com variações, preços e custos."
        actions={
          <Button asChild>
            <Link to="/produtos/novo">
              <Plus /> Novo produto
            </Link>
          </Button>
        }
      />

      {products.isLoading ? (
        <LoadingRows rows={6} />
      ) : products.error ? (
        <ErrorState error={products.error} onRetry={products.refetch} />
      ) : !hasProducts ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Cadastre seus produtos com variações de cor e tamanho para começar a registrar vendas."
          action={
            <Button asChild>
              <Link to="/produtos/novo">
                <Plus /> Cadastrar produto
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, SKU ou variação"
                className="pl-9"
                aria-label="Buscar produtos"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-52" aria-label="Categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as categorias</SelectItem>
                {categories.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="sm:w-40" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="archived">Arquivados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado com esses filtros.
            </p>
          ) : (
            <ProductsTable
              products={filtered}
              onEdit={(p) => navigate(`/produtos/${p.id}`)}
              onCostSheet={(p) => navigate(`/produtos/${p.id}/ficha`)}
              onToggleArchive={(p) => archive.mutate(p)}
              onDelete={setDeleting}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="A exclusão é permanente e só é possível para produtos sem vendas nem movimentações de estoque. Para os demais, use Arquivar."
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
