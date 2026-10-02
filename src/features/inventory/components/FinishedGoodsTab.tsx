import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { formatCurrency, formatQuantity, formatUnitCost } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FinishedGood, StockTarget } from '../api'
import { useFinishedGoods } from '../hooks'
import { isLowStock, stockValue } from '../movements'
import { HistorySheet } from './HistorySheet'
import { MovementDialog, type MovementMode } from './MovementDialog'
import { ProductionDialog } from './ProductionDialog'
import { StockActions } from './StockActions'

const toTarget = (v: FinishedGood): StockTarget => ({
  kind: 'product',
  id: v.id,
  name: v.label ? `${v.productName} · ${v.label}` : v.productName,
  unit: 'un',
  currentQty: v.currentQty,
  avgCost: v.avgCost,
})

export function FinishedGoodsTab() {
  const goods = useFinishedGoods()
  const [moving, setMoving] = useState<{ target: StockTarget; mode: MovementMode } | null>(null)
  const [history, setHistory] = useState<StockTarget | null>(null)
  const [producing, setProducing] = useState<FinishedGood | null>(null)

  if (goods.isLoading) return <LoadingRows rows={5} />
  if (goods.error) return <ErrorState error={goods.error} onRetry={goods.refetch} />

  if (!goods.data?.length) {
    return (
      <EmptyState
        icon={PackageCheck}
        title="Nenhum produto com estoque pronto"
        description='Produtos marcados como "Estoque pronto" aparecem aqui. Produtos sob encomenda não têm estoque de peças prontas.'
        action={
          <Link to="/produtos" className="text-sm underline underline-offset-2">
            Ir para Produtos
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Em estoque</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Custo médio</TableHead>
              <TableHead className="text-right">Valor em estoque</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {goods.data.map((v) => (
              <TableRow key={v.id} className={v.isActive ? undefined : 'opacity-60'}>
                <TableCell>
                  <button type="button" className="text-left font-medium hover:underline" onClick={() => setHistory(toTarget(v))}>
                    {v.productName}
                  </button>
                  {v.label && <div className="text-xs text-muted-foreground">{v.label}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isLowStock(v.currentQty, v.minStock) && <Badge variant="warning">Estoque baixo</Badge>}
                    <span className={cn('font-medium tabular-nums', v.currentQty < 0 && 'text-danger')}>
                      {formatQuantity(v.currentQty)} un
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {v.minStock > 0 ? `${formatQuantity(v.minStock)} un` : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatUnitCost(v.avgCost)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(stockValue(v.currentQty, v.avgCost))}</TableCell>
                <TableCell>
                  <StockActions
                    onProduce={() => setProducing(v)}
                    onMove={(mode) => setMoving({ target: toTarget(v), mode })}
                    onHistory={() => setHistory(toTarget(v))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Use "Registrar produção" ao imprimir peças para estoque: os insumos são baixados e as peças entram aqui. A venda
        baixa as peças prontas.
      </p>

      <ProductionDialog variant={producing} onClose={() => setProducing(null)} />
      <MovementDialog target={moving?.target ?? null} mode={moving?.mode ?? 'IN'} onClose={() => setMoving(null)} />
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </div>
  )
}
