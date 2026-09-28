import { ColumnsChart, RevenueChart } from '@/components/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent, formatQuantity } from '@/lib/format'
import type { ReportDetails, ResultPoint } from '../api'
import { marginOf, sumFields } from '../totals'
import { ReportTable, type ReportColumn } from './ReportTable'
import { StatStrip } from './StatStrip'

const COLUMNS: ReportColumn<ResultPoint>[] = [
  { label: 'Período', value: (r) => r.date, format: 'bucket' },
  { label: 'Vendas', value: (r) => r.sales_count, format: 'number' },
  { label: 'Unidades', value: (r) => r.units, format: 'number' },
  { label: 'Bruto', value: (r) => r.gross, format: 'currency' },
  { label: 'Taxas', value: (r) => r.fees, format: 'currency' },
  { label: 'Recebido', value: (r) => r.received, format: 'currency' },
  { label: 'Custo', value: (r) => r.cost, format: 'currency' },
  { label: 'Lucro', value: (r) => r.profit, format: 'currency', strong: true, signed: true },
  { label: 'Margem', value: (r) => r.margin, format: 'percent', signed: true },
]

export function ResultsTab({ data }: { data: ReportDetails }) {
  const t = sumFields(data.series, ['sales_count', 'units', 'gross', 'fees', 'received', 'cost', 'profit'])
  const margin = marginOf(t.profit, t.received)
  const period = data.bucket === 'month' ? 'mês' : data.bucket === 'week' ? 'semana' : 'dia'

  return (
    <div className="space-y-4">
      <StatStrip
        label="Resultado do período"
        stats={[
          { label: 'Faturamento bruto', value: formatCurrency(t.gross) },
          { label: 'Recebido', value: formatCurrency(t.received), hint: `${formatCurrency(t.fees)} em taxas` },
          { label: 'Custo dos vendidos', value: formatCurrency(t.cost) },
          { label: 'Lucro líquido', value: formatCurrency(t.profit), tone: t.profit < 0 ? 'negative' : undefined },
          { label: 'Margem média', value: formatPercent(margin), hint: 'Lucro ÷ recebido' },
          { label: 'Vendas', value: formatQuantity(t.sales_count), hint: `${formatQuantity(t.units)} unidades` },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento</CardTitle>
            <CardDescription>Bruto e recebido por {period}.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.series} bucket={data.bucket} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lucro líquido</CardTitle>
            <CardDescription>Por {period}, pelo custo registrado em cada venda.</CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnsChart
              data={data.series}
              bucket={data.bucket}
              series={[{ key: 'profit', label: 'Lucro líquido', color: 'var(--chart-1)' }]}
            />
          </CardContent>
        </Card>
      </div>
      <ReportTable
        title={`Vendas por ${period}`}
        columns={COLUMNS}
        rows={data.series}
        rowKey={(r) => r.date}
        bucket={data.bucket}
        filename={`vendas-por-${period}_${data.from}_${data.to}`}
        totals={['Total', t.sales_count, t.units, t.gross, t.fees, t.received, t.cost, t.profit, margin]}
      />
    </div>
  )
}
