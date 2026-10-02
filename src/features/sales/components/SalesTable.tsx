import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RowActions } from '@/components/RowActions'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SaleLine } from '../api'
import { attributesOf, type Sort, type SortKey } from '../list'

const PAGE_SIZE = 50

type SalesTableProps = {
  lines: SaleLine[]
  attributeColumns: string[]
  sort: Sort
  onSortChange: (sort: Sort) => void
  onEdit: (line: SaleLine) => void
  onDelete: (line: SaleLine) => void
}

function SortHeader({
  label,
  column,
  sort,
  onSortChange,
  align = 'left',
}: {
  label: string
  column: SortKey
  sort: Sort
  onSortChange: (sort: Sort) => void
  align?: 'left' | 'right'
}) {
  const active = sort.key === column
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  // Numbers and dates start descending (largest/newest first); text ascending.
  const firstDir = column === 'product_name' || column === 'sku' || column === 'channel_name' ? 'asc' : 'desc'
  return (
    <TableHead
      className={cn(align === 'right' && 'text-right')}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
          active && 'text-foreground',
        )}
        onClick={() =>
          onSortChange({
            key: column,
            dir: active ? (sort.dir === 'asc' ? 'desc' : 'asc') : firstDir,
          })
        }
      >
        {label}
        <Icon className={cn('size-3.5', !active && 'opacity-40')} />
      </button>
    </TableHead>
  )
}

const money = (v: number | null) => <span className="tabular-nums">{formatCurrency(v)}</span>

export function SalesTable({ lines, attributeColumns, sort, onSortChange, onEdit, onDelete }: SalesTableProps) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(lines.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const visible = lines.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  const header = { sort, onSortChange }

  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Data" column="sale_date" {...header} />
              <SortHeader label="Produto" column="product_name" {...header} />
              <SortHeader label="SKU" column="sku" {...header} />
              {attributeColumns.map((name) => (
                <TableHead key={name}>{name}</TableHead>
              ))}
              <TableHead>Personalizado</TableHead>
              <SortHeader label="Canal" column="channel_name" {...header} />
              <SortHeader label="Qtd." column="quantity" align="right" {...header} />
              <SortHeader label="Preço bruto" column="gross_amount" align="right" {...header} />
              <SortHeader label="Recebido" column="received_amount" align="right" {...header} />
              <SortHeader label="Taxas" column="fees" align="right" {...header} />
              <SortHeader label="Custo" column="total_cost" align="right" {...header} />
              <SortHeader label="Lucro líquido" column="profit" align="right" {...header} />
              <SortHeader label="Margem" column="margin" align="right" {...header} />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((l) => {
              const attrs = attributesOf(l)
              const loss = (l.profit ?? 0) < 0
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDate(l.sale_date)}</TableCell>
                  <TableCell className="max-w-56">
                    <div className="truncate font-medium" title={l.product_name ?? undefined}>
                      {l.product_name}
                    </div>
                    {(l.customization_notes || l.notes) && (
                      <div
                        className="truncate text-xs text-muted-foreground"
                        title={[l.customization_notes, l.notes].filter(Boolean).join(' · ')}
                      >
                        {[l.customization_notes, l.notes].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{l.sku}</TableCell>
                  {attributeColumns.map((name) => (
                    <TableCell key={name} className="whitespace-nowrap">
                      {attrs[name] ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  ))}
                  <TableCell>
                    {l.is_customized ? <Badge variant="outline">Sim</Badge> : <span className="text-muted-foreground">Não</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{l.channel_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                  <TableCell className="text-right">{money(l.gross_amount)}</TableCell>
                  <TableCell className="text-right">{money(l.received_amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{money(l.fees)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{money(l.total_cost)}</TableCell>
                  <TableCell className={cn('text-right font-medium', loss && 'text-danger')}>
                    {money(l.profit)}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', loss && 'text-danger')}>
                    {formatPercent(l.margin)}
                  </TableCell>
                  <TableCell>
                    <RowActions onEdit={() => onEdit(l)} onDelete={() => onDelete(l)} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 border-t px-4 py-2 text-sm">
          <span className="text-muted-foreground">
            {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, lines.length)} de {lines.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Página anterior"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Próxima página"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
