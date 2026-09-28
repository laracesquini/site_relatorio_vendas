import { useDeferredValue, useMemo, useState } from 'react'
import { Loader2, Plus, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { sumSales } from '@/domain/sale'
import { useAppMutation } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { dashboardKeys } from '@/features/dashboard/api'
import { productKeys } from '@/features/products/api'
import { useProducts } from '@/features/products/hooks'
import { useCategoryOptions, useChannels } from '@/features/settings/hooks'
import { deleteSale, salesKeys, type SaleLine } from '../api'
import { SalesFilters } from '../components/SalesFilters'
import { SalesTable } from '../components/SalesTable'
import { SalesTotalsBar } from '../components/SalesTotalsBar'
import { useSaleLines } from '../hooks'
import { attributeColumns, DEFAULT_SORT, searchSaleLines, sortSaleLines, type Sort } from '../list'
import { useSaleSheet } from '../sale-sheet-context'
import { useSalesFilters } from '../useSalesFilters'

export default function SalesPage() {
  const { openNewSale, openEditSale } = useSaleSheet()
  const filters = useSalesFilters()
  const lines = useSaleLines(filters.query)
  const channels = useChannels()
  const products = useProducts()
  const categories = useCategoryOptions('product')
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)
  const [deleting, setDeleting] = useState<SaleLine | null>(null)
  const search = useDeferredValue(filters.state.search)

  const remove = useAppMutation({
    mutationFn: (l: SaleLine) => deleteSale(l.sale_id!),
    invalidate: [salesKeys.all, productKeys.all, dashboardKeys.all],
    successMessage: 'Venda excluída',
    onSuccess: () => setDeleting(null),
  })

  const visible = useMemo(
    () => sortSaleLines(searchSaleLines(lines.data ?? [], search), sort),
    [lines.data, search, sort],
  )
  const totals = useMemo(() => sumSales(visible), [visible])
  const columns = useMemo(() => attributeColumns(lines.data ?? []), [lines.data])
  const noFilters = filters.activeCount === 0 && filters.state.period === 'all'

  return (
    <>
      <PageHeader
        title="Vendas"
        description="Todas as vendas, com os valores registrados no momento de cada uma."
        actions={
          <Button onClick={openNewSale}>
            <Plus /> Nova venda
          </Button>
        }
      />

      <div className="space-y-4">
        <SalesFilters
          state={filters.state}
          update={filters.update}
          clear={filters.clear}
          activeCount={filters.activeCount}
          channels={channels.data ?? []}
          products={(products.data ?? []).filter((p) => !p.archived_at)}
          categories={categories.data ?? []}
        />

        {lines.isLoading ? (
          <LoadingRows rows={8} />
        ) : lines.error ? (
          <ErrorState error={lines.error} onRetry={lines.refetch} />
        ) : (
          <>
            <div className="relative">
              <SalesTotalsBar totals={totals} />
              {lines.isFetching && (
                <Loader2 className="absolute -top-6 right-0 size-4 animate-spin text-muted-foreground" aria-label="Atualizando" />
              )}
            </div>

            {visible.length === 0 ? (
              lines.data?.length === 0 && noFilters ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Nenhuma venda registrada"
                  description="Registre sua primeira venda: o sistema calcula taxas, custo e lucro na hora."
                  action={
                    <Button onClick={openNewSale}>
                      <Plus /> Nova venda
                    </Button>
                  }
                />
              ) : (
                <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Nenhuma venda encontrada com esses filtros.
                </p>
              )
            ) : (
              <SalesTable
                // Back to the first page whenever the result set changes.
                key={`${JSON.stringify(filters.query)}|${search}|${sort.key}|${sort.dir}`}
                lines={visible}
                attributeColumns={columns}
                sort={sort}
                onSortChange={setSort}
                onEdit={openEditSale}
                onDelete={setDeleting}
              />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir esta venda?"
        description={
          deleting
            ? `${deleting.product_name} · ${formatDate(deleting.sale_date)} · ${formatCurrency(deleting.gross_amount)}. ` +
              'A venda sai das listas e relatórios, e o estoque que ela baixou é devolvido. O registro fica guardado no histórico.'
            : ''
        }
        confirmLabel="Excluir venda"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
