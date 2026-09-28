import { useMemo, useState } from 'react'
import { Boxes, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { formatCurrency, formatQuantity, formatUnitCost } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCategoryOptions } from '@/features/settings/hooks'
import { deleteInventoryItem, setInventoryItemArchived, type InventoryItem, type StockTarget } from '../api'
import { useInventoryItems, useStockMutation } from '../hooks'
import { isLowStock, stockValue } from '../movements'
import { HistorySheet } from './HistorySheet'
import { ItemFormDialog } from './ItemFormDialog'
import { MovementDialog, type MovementMode } from './MovementDialog'
import { StockActions } from './StockActions'

const ALL = '__all'
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const toTarget = (i: InventoryItem): StockTarget => ({
  kind: 'material',
  id: i.id,
  name: i.name,
  unit: i.unit?.code ?? '',
  currentQty: i.current_qty,
  avgCost: i.avg_cost,
})

export function MaterialsTab() {
  const items = useInventoryItems()
  const categories = useCategoryOptions('material')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [lowOnly, setLowOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null)
  const [moving, setMoving] = useState<{ target: StockTarget; mode: MovementMode } | null>(null)
  const [history, setHistory] = useState<StockTarget | null>(null)
  const [deleting, setDeleting] = useState<InventoryItem | null>(null)

  const archive = useStockMutation(
    (i: InventoryItem) => setInventoryItemArchived(i.id, !i.archived_at),
    (_, i) => (i.archived_at ? 'Insumo restaurado' : 'Insumo arquivado'),
  )
  const remove = useStockMutation((i: InventoryItem) => deleteInventoryItem(i.id), 'Insumo excluído', () =>
    setDeleting(null),
  )

  const visible = useMemo(() => {
    const term = normalize(search.trim())
    return (items.data ?? []).filter(
      (i) =>
        (showArchived ? Boolean(i.archived_at) : !i.archived_at) &&
        (category === ALL || i.category_id === category) &&
        (!lowOnly || isLowStock(i.current_qty, i.min_qty)) &&
        (!term || normalize(i.name).includes(term)),
    )
  }, [items.data, search, category, lowOnly, showArchived])

  if (items.isLoading) return <LoadingRows rows={6} />
  if (items.error) return <ErrorState error={items.error} onRetry={items.refetch} />

  const newButton = (
    <Button onClick={() => setEditing('new')}>
      <Plus /> Novo insumo
    </Button>
  )

  return (
    <div className="space-y-4">
      {items.data?.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhum insumo cadastrado"
          description="Cadastre filamentos, argolas, embalagens e componentes para controlar estoque e custo médio."
          action={newButton}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:min-w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar insumo"
                className="pl-9"
                aria-label="Buscar insumo"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-52" aria-label="Categoria">
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
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={lowOnly} onCheckedChange={setLowOnly} /> Só estoque baixo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} /> Arquivados
            </label>
            <div className="sm:ml-auto">{newButton}</div>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Nenhum insumo encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Em estoque</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Custo médio</TableHead>
                    <TableHead className="text-right">Valor em estoque</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((i) => {
                    const unit = i.unit?.code
                    const low = isLowStock(i.current_qty, i.min_qty)
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left font-medium hover:underline"
                            onClick={() => setHistory(toTarget(i))}
                          >
                            {i.name}
                          </button>
                          <div className="text-xs text-muted-foreground">{i.category?.name ?? 'Sem categoria'}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {low && <Badge variant="warning">Estoque baixo</Badge>}
                            <span className={cn('font-medium tabular-nums', i.current_qty < 0 && 'text-danger')}>
                              {formatQuantity(i.current_qty, unit)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {i.min_qty > 0 ? formatQuantity(i.min_qty, unit) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUnitCost(i.avg_cost)}
                          <span className="text-muted-foreground">/{unit}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(stockValue(i.current_qty, i.avg_cost))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{i.supplier?.name ?? '—'}</TableCell>
                        <TableCell>
                          <StockActions
                            onMove={(mode) => setMoving({ target: toTarget(i), mode })}
                            onHistory={() => setHistory(toTarget(i))}
                            onEdit={() => setEditing(i)}
                            onToggleArchive={() => archive.mutate(i)}
                            archived={Boolean(i.archived_at)}
                            onDelete={() => setDeleting(i)}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <ItemFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        item={editing === 'new' || editing === null ? undefined : editing}
      />
      <MovementDialog target={moving?.target ?? null} mode={moving?.mode ?? 'IN'} onClose={() => setMoving(null)} />
      <HistorySheet target={history} onClose={() => setHistory(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="Só é possível excluir insumos sem movimentações e fora das fichas de custo. Para os demais, use Arquivar."
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  )
}
