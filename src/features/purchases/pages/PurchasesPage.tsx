import { useDeferredValue, useMemo, useState } from 'react'
import { Plus, Search, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PeriodFilter } from '@/components/PeriodFilter'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { RowActions } from '@/components/RowActions'
import { useAppMutation } from '@/lib/api'
import { formatCurrency, formatDate, formatQuantity, formatUnitCost } from '@/lib/format'
import { usePeriodParams } from '@/lib/usePeriodParams'
import { dashboardKeys } from '@/features/dashboard/api'
import { reportKeys } from '@/features/reports/api'
import { inventoryKeys } from '@/features/inventory/api'
import { productKeys } from '@/features/products/api'
import { deletePurchase, purchaseKeys, type PurchaseLine } from '../api'
import { PurchaseSheet, type PurchaseSheetMode } from '../components/PurchaseSheet'
import { usePurchaseList } from '../hooks'
import { searchPurchaseLines, sumPurchases } from '../list'

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-base font-semibold tabular-nums">{value}</div>
      <div className="truncate text-xs text-muted-foreground">{hint}</div>
    </div>
  )
}

export default function PurchasesPage() {
  const period = usePeriodParams('thisMonth')
  const lines = usePurchaseList(period.range.from, period.range.to)
  const [search, setSearch] = useState('')
  const term = useDeferredValue(search)
  const [sheet, setSheet] = useState<PurchaseSheetMode>(null)
  const [deleting, setDeleting] = useState<PurchaseLine | null>(null)

  const remove = useAppMutation({
    mutationFn: (l: PurchaseLine) => deletePurchase(l.purchase_id!),
    invalidate: [purchaseKeys.all, inventoryKeys.all, dashboardKeys.all, reportKeys.all, productKeys.all],
    successMessage: 'Compra excluída',
    onSuccess: () => setDeleting(null),
  })

  const visible = useMemo(() => searchPurchaseLines(lines.data ?? [], term), [lines.data, term])
  const totals = useMemo(() => sumPurchases(visible), [visible])
  const openNew = () => setSheet({ kind: 'new' })

  return (
    <>
      <PageHeader
        title="Compras e despesas"
        description="Tudo o que sai do caixa. Materiais comprados entram no estoque e viram custo conforme são usados."
        actions={
          <Button onClick={openNew}>
            <Plus /> Nova compra
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar item, categoria ou fornecedor"
              className="pl-9"
              aria-label="Buscar compras"
            />
          </div>
          <PeriodFilter
            value={period.period}
            customFrom={period.customFrom}
            customTo={period.customTo}
            onChange={period.update}
          />
        </div>

        {lines.isLoading ? (
          <LoadingRows rows={6} />
        ) : lines.error ? (
          <ErrorState error={lines.error} onRetry={lines.refetch} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Totais das compras filtradas">
              <Stat
                label="Total gasto"
                value={formatCurrency(totals.total)}
                hint={`${totals.purchases} ${totals.purchases === 1 ? 'compra' : 'compras'}`}
              />
              <Stat label="Para o estoque" value={formatCurrency(totals.toStock)} hint="Vira custo ao ser usado" />
              <Stat label="Despesas operacionais" value={formatCurrency(totals.operational)} hint="Descontadas do resultado" />
              <Stat label="Outras" value={formatCurrency(totals.other)} hint="Fora do estoque" />
            </div>

            {visible.length === 0 ? (
              (lines.data?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="Nenhuma compra no período"
                  description="Registre filamentos, argolas, embalagens e despesas como anúncios e frete."
                  action={
                    <Button onClick={openNew}>
                      <Plus /> Nova compra
                    </Button>
                  }
                />
              ) : (
                <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Nenhuma compra encontrada.
                </p>
              )
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Valor total</TableHead>
                      <TableHead className="text-right">Preço unit.</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatDate(l.purchase_date)}</TableCell>
                        <TableCell className="max-w-56">
                          <div className="truncate font-medium">{l.description}</div>
                          {(l.purchase_item_count ?? 1) > 1 && (
                            <div className="text-xs text-muted-foreground">
                              Compra de {l.purchase_item_count} itens · {formatCurrency(l.purchase_total)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.category_name ?? <span className="text-muted-foreground">—</span>}
                          {l.is_operational && <span className="ml-1 text-xs text-muted-foreground">(operacional)</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatQuantity(l.quantity)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(l.total_amount)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatUnitCost(l.unit_price)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {l.add_to_stock ? (
                            <Badge variant="success" title={`${formatUnitCost(l.stock_unit_cost)}/${l.stock_unit}`}>
                              +{formatQuantity(l.stock_quantity, l.stock_unit ?? undefined)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{l.supplier_name ?? '—'}</TableCell>
                        <TableCell>
                          <RowActions
                            onEdit={() => setSheet({ kind: 'edit', purchaseId: l.purchase_id! })}
                            onDelete={() => setDeleting(l)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      <PurchaseSheet mode={sheet} onClose={() => setSheet(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir esta compra?"
        description={
          deleting
            ? `${formatDate(deleting.purchase_date)} · ${formatCurrency(deleting.purchase_total)}` +
              ((deleting.purchase_item_count ?? 1) > 1 ? ` (${deleting.purchase_item_count} itens)` : '') +
              '. A compra sai das listas e relatórios, e o que ela colocou no estoque é retirado (o custo médio é recalculado). O registro fica no histórico.'
            : ''
        }
        confirmLabel="Excluir compra"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
