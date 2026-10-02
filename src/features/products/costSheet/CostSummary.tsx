import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { marginOnPrice, sheetCost } from '@/domain/cost'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { InventoryItem } from '@/features/inventory/api'
import type { VariantView } from '../model'
import type { CostSheetForm, MaterialRowForm } from './schema'

type CostSummaryProps = {
  values: CostSheetForm
  variants: VariantView[]
  items: InventoryItem[]
}

/** Cost per piece of each variant, as the sheet on screen would price it. */
export function CostSummary({ values, variants, items }: CostSummaryProps) {
  const byId = new Map(items.map((i) => [i.id, i]))
  const priced = (rows: MaterialRowForm[]) =>
    rows.flatMap((r) => {
      const item = r.inventory_item_id ? byId.get(r.inventory_item_id) : undefined
      return item && r.quantity ? [{ quantity: r.quantity, unitCost: item.avg_cost }] : []
    })
  const extras = values.extras.map((e) => e.amount)

  const rows = variants
    .filter((v) => v.isActive)
    .map((v) => {
      const own = values.variant_sheets.find((s) => s.variant_id === v.id)
      const materials = own?.enabled && own.materials.length > 0 ? own.materials : values.materials
      const cost = sheetCost(priced(materials), extras)
      return { v, cost, ownSheet: Boolean(own?.enabled && own.materials.length > 0) }
    })

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Variação</TableHead>
            <TableHead className="text-right">Insumos</TableHead>
            <TableHead className="text-right">Adicionais</TableHead>
            <TableHead className="text-right">Custo por peça</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Sobra do preço</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ v, cost, ownSheet }) => (
            <TableRow key={v.id}>
              <TableCell>
                <div className="font-medium">{v.label}</div>
                <div className="text-xs text-muted-foreground">
                  {ownSheet ? 'Ficha própria' : v.isDefault ? 'Ficha do produto' : 'Usa a ficha do produto'}
                  {v.costOverride !== null && ` · custo manual ${formatCurrency(v.costOverride)} prevalece nas vendas`}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(cost.materials)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(cost.extras)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(cost.total)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(v.price)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPercent(marginOnPrice(v.price, cost.total))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        "Sobra do preço" é antes das taxas do marketplace. Os custos usam o custo médio atual dos insumos e mudam com
        novas compras; vendas já registradas mantêm o custo da época.
      </p>
    </div>
  )
}
