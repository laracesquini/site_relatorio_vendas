import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime, formatQuantity, formatUnitCost } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MovementRow } from '../api'
import { describeOrigin, MOVEMENT_TYPE_LABEL, type MovementType } from '../movements'

const TYPE_VARIANT: Record<MovementType, 'success' | 'secondary' | 'outline'> = {
  IN: 'success',
  OUT: 'secondary',
  ADJUSTMENT: 'outline',
}

type MovementsTableProps = {
  rows: MovementRow[]
  /** Hide the item column when all rows are for the same item. */
  showItem?: boolean
}

export function MovementsTable({ rows, showItem = true }: MovementsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            {showItem && <TableHead>Item</TableHead>}
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Custo unit.</TableHead>
            <TableHead className="text-right">Saldo depois</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => {
            const type = (m.movement_type ?? 'IN') as MovementType
            const qty = m.quantity ?? 0
            const unit = m.unit ?? undefined
            return (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(m.occurred_at)}</TableCell>
                {showItem && (
                  <TableCell className="max-w-56">
                    <div className="truncate font-medium">{m.item_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.kind === 'product' ? ['Produto pronto', m.variant_label].filter(Boolean).join(' · ') : 'Insumo'}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={TYPE_VARIANT[type]}>{MOVEMENT_TYPE_LABEL[type]}</Badge>
                </TableCell>
                <TableCell className={cn('text-right font-medium tabular-nums', qty < 0 && 'text-danger')}>
                  {qty > 0 ? '+' : ''}
                  {formatQuantity(qty, unit)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{formatUnitCost(m.unit_cost)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQuantity(m.balance_after, unit)}</TableCell>
                <TableCell className="max-w-64">
                  <div className="truncate">{describeOrigin(m)}</div>
                  {m.notes && <div className="truncate text-xs text-muted-foreground" title={m.notes}>{m.notes}</div>}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
