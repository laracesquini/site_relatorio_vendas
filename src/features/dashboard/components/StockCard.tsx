import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { formatCurrency, formatQuantity } from '@/lib/format'
import { useLowStock, useStockValue } from '../hooks'

/** "What do I have in stock / what do I need to buy?" — not tied to the period filter. */
export function StockCard() {
  const lowStock = useLowStock()
  const value = useStockValue()
  const items = lowStock.data ?? []

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Estoque
          {items.length > 0 && (
            <Badge variant="warning">
              <AlertTriangle /> {items.length} {items.length === 1 ? 'item baixo' : 'itens baixos'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Situação atual, independente do período.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
        {value.data && (
          <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-1">
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">Insumos em estoque</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatCurrency(value.data.materials)}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">Produtos prontos</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatCurrency(value.data.finishedProducts)}</dd>
            </div>
          </dl>
        )}

        {lowStock.isLoading ? (
          <LoadingRows rows={3} />
        ) : lowStock.error ? (
          <ErrorState error={lowStock.error} onRetry={lowStock.refetch} />
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" /> Nenhum item abaixo do estoque mínimo.
          </p>
        ) : (
          <div>
            <p className="mb-2 text-sm font-medium">Para repor</p>
            <ul className="divide-y text-sm">
              {items.slice(0, 8).map((i) => (
                <li key={`${i.kind}-${i.id}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate">
                      {i.name}
                      {i.detail && <span className="text-muted-foreground"> · {i.detail}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {i.kind === 'material' ? 'Insumo' : 'Produto pronto'} · mínimo {formatQuantity(i.min_qty, i.unit ?? undefined)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-medium tabular-nums">{formatQuantity(i.current_qty, i.unit ?? undefined)}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      faltam {formatQuantity(i.shortfall, i.unit ?? undefined)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {items.length > 8 && (
              <Link to="/estoque?aba=insumos" className="mt-2 inline-block text-sm underline underline-offset-2">
                Ver todos os {items.length} itens
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
