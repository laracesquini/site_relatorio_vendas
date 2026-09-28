import { Link } from 'react-router-dom'
import { AlertTriangle, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatQuantity } from '@/lib/format'
import { RowActions } from '@/components/RowActions'
import type { ProductView } from '../model'

const formatRange = ([min, max]: [number, number]) =>
  min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`

type ProductsTableProps = {
  products: ProductView[]
  onEdit: (product: ProductView) => void
  onCostSheet: (product: ProductView) => void
  onToggleArchive: (product: ProductView) => void
  onDelete: (product: ProductView) => void
}

export function ProductsTable({ products, onEdit, onCostSheet, onToggleArchive, onDelete }: ProductsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Custo atual</TableHead>
            <TableHead className="text-right">Estoque pronto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id} className={p.archived_at ? 'opacity-60' : undefined}>
              <TableCell>
                <Link to={`/produtos/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {[p.category?.name, p.hasVariations && `${p.variants.length} variações`]
                    .filter(Boolean)
                    .join(' · ') || 'Sem categoria'}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">{p.sku}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRange(p.priceRange)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRange(p.costRange)}
                <div className="text-xs text-muted-foreground">
                  {p.variants.some((v) => v.costSource === 'sheet') ? 'pela ficha' : 'estimado'}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {p.stockMode === 'stocked' ? (
                  <span className="inline-flex items-center gap-1">
                    {p.lowStockCount > 0 && (
                      <AlertTriangle className="size-3.5 text-warning" aria-label="Estoque baixo" />
                    )}
                    {formatQuantity(p.totalStock)} un
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Sob encomenda</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {p.archived_at ? (
                    <Badge variant="secondary">Arquivado</Badge>
                  ) : p.is_active ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                  {p.is_customizable && <Badge variant="outline">Personalizável</Badge>}
                  {p.lowStockCount > 0 && <Badge variant="warning">Estoque baixo</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <RowActions
                  onEdit={() => onEdit(p)}
                  extra={[{ label: 'Ficha de custo', icon: ClipboardList, onSelect: () => onCostSheet(p) }]}
                  onToggleArchive={() => onToggleArchive(p)}
                  archived={Boolean(p.archived_at)}
                  onDelete={() => onDelete(p)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
