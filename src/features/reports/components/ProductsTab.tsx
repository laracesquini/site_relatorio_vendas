import type { CategoryResult, ProductResult, ReportDetails } from '../api'
import { marginOf, sumFields } from '../totals'
import { ReportTable, type ReportColumn } from './ReportTable'

const PRODUCT_COLUMNS: ReportColumn<ProductResult>[] = [
  { label: 'Produto', value: (r) => r.name, strong: true },
  { label: 'Categoria', value: (r) => r.category_name ?? 'Sem categoria' },
  { label: 'Unidades', value: (r) => r.units, format: 'number' },
  { label: 'Vendas', value: (r) => r.sales_count, format: 'number' },
  { label: 'Bruto', value: (r) => r.gross, format: 'currency' },
  { label: 'Recebido', value: (r) => r.received, format: 'currency' },
  { label: 'Custo', value: (r) => r.cost, format: 'currency' },
  { label: 'Lucro', value: (r) => r.profit, format: 'currency', strong: true, signed: true },
  { label: 'Margem', value: (r) => r.margin, format: 'percent', signed: true },
]

const CATEGORY_COLUMNS: ReportColumn<CategoryResult>[] = [
  { label: 'Categoria', value: (r) => r.name, strong: true },
  { label: 'Unidades', value: (r) => r.units, format: 'number' },
  { label: 'Bruto', value: (r) => r.gross, format: 'currency' },
  { label: 'Recebido', value: (r) => r.received, format: 'currency' },
  { label: 'Custo', value: (r) => r.cost, format: 'currency' },
  { label: 'Lucro', value: (r) => r.profit, format: 'currency', strong: true, signed: true },
  { label: 'Margem', value: (r) => r.margin, format: 'percent', signed: true },
]

export function ProductsTab({ data }: { data: ReportDetails }) {
  const p = sumFields(data.by_product, ['units', 'sales_count', 'gross', 'received', 'cost', 'profit'])
  const c = sumFields(data.by_category, ['units', 'gross', 'received', 'cost', 'profit'])
  return (
    <div className="space-y-4">
      <ReportTable
        title="Produtos"
        description="Todos os produtos vendidos no período, do mais lucrativo ao menos. Ordene no Excel pela coluna que quiser."
        columns={PRODUCT_COLUMNS}
        rows={data.by_product}
        rowKey={(r) => r.product_id}
        filename={`produtos_${data.from}_${data.to}`}
        totals={['Total', '', p.units, undefined, p.gross, p.received, p.cost, p.profit, marginOf(p.profit, p.received)]}
      />
      <ReportTable
        title="Categorias de produto"
        columns={CATEGORY_COLUMNS}
        rows={data.by_category}
        rowKey={(r) => r.category_id ?? 'none'}
        filename={`categorias_${data.from}_${data.to}`}
        totals={['Total', c.units, c.gross, c.received, c.cost, c.profit, marginOf(c.profit, c.received)]}
      />
    </div>
  )
}
