import { ColumnsChart, type Series } from '@/components/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import type { CostCategory, CostPoint, ReportDetails } from '../api'
import { sumFields } from '../totals'
import { ReportTable, type ReportColumn } from './ReportTable'
import { StatStrip } from './StatStrip'

const SERIES: Series[] = [
  { key: 'to_stock', label: 'Para o estoque', color: 'var(--chart-1)' },
  { key: 'operational', label: 'Despesas operacionais', color: 'var(--chart-2)' },
  { key: 'other', label: 'Outras', color: 'var(--chart-3)' },
]

const KIND_LABEL: Record<CostCategory['kind'], string> = {
  stock: 'Estoque',
  operational: 'Operacional',
  other: 'Outra',
}

const CATEGORY_COLUMNS: ReportColumn<CostCategory>[] = [
  { label: 'Categoria', value: (r) => r.name, strong: true },
  { label: 'Tipo', value: (r) => KIND_LABEL[r.kind] },
  { label: 'Total', value: (r) => r.total, format: 'currency', strong: true },
]

const SERIES_COLUMNS: ReportColumn<CostPoint>[] = [
  { label: 'Período', value: (r) => r.date, format: 'bucket' },
  { label: 'Para o estoque', value: (r) => r.to_stock, format: 'currency' },
  { label: 'Operacionais', value: (r) => r.operational, format: 'currency' },
  { label: 'Outras', value: (r) => r.other, format: 'currency' },
  { label: 'Total', value: (r) => r.total, format: 'currency', strong: true },
]

export function CostsTab({ data }: { data: ReportDetails }) {
  const t = sumFields(data.cost_series, ['to_stock', 'operational', 'other', 'total'])
  const period = data.bucket === 'month' ? 'mês' : data.bucket === 'week' ? 'semana' : 'dia'
  return (
    <div className="space-y-4">
      <StatStrip
        label="Custos do período"
        stats={[
          { label: 'Total gasto', value: formatCurrency(t.total) },
          { label: 'Para o estoque', value: formatCurrency(t.to_stock), hint: 'Vira custo ao ser usado' },
          { label: 'Operacionais', value: formatCurrency(t.operational), hint: 'Reduzem o resultado' },
          { label: 'Outras', value: formatCurrency(t.other) },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Evolução dos custos</CardTitle>
          <CardDescription>Compras e despesas por {period}.</CardDescription>
        </CardHeader>
        <CardContent>
          {t.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma compra ou despesa no período.</p>
          ) : (
            <ColumnsChart data={data.cost_series} bucket={data.bucket} series={SERIES} stacked />
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportTable
          title="Por categoria"
          columns={CATEGORY_COLUMNS}
          rows={data.costs_by_category}
          rowKey={(r) => r.category_id ?? 'none'}
          filename={`custos-por-categoria_${data.from}_${data.to}`}
          totals={['Total', '', t.total]}
          emptyText="Nenhuma compra ou despesa no período."
        />
        <ReportTable
          title={`Por ${period}`}
          columns={SERIES_COLUMNS}
          rows={data.cost_series}
          rowKey={(r) => r.date}
          bucket={data.bucket}
          filename={`custos-por-${period}_${data.from}_${data.to}`}
          totals={['Total', t.to_stock, t.operational, t.other, t.total]}
        />
      </div>
    </div>
  )
}
