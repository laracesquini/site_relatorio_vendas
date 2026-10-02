import { Info } from 'lucide-react'
import { ColumnsChart, type Series } from '@/components/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { formatCurrency } from '@/lib/format'
import { useCashFlow, type CashPoint, type ReportDetails, type ReportQuery } from '../api'
import { sumFields } from '../totals'
import { OtherIncomes } from './OtherIncomes'
import { ReportTable, type ReportColumn } from './ReportTable'
import { StatStrip } from './StatStrip'

const SERIES: Series[] = [
  { key: 'inflows', label: 'Entradas', color: 'var(--chart-1)' },
  { key: 'outflows', label: 'Saídas', color: 'var(--chart-2)' },
]

const COLUMNS: ReportColumn<CashPoint>[] = [
  { label: 'Período', value: (r) => r.date, format: 'bucket' },
  { label: 'Vendas recebidas', value: (r) => r.sales_in, format: 'currency' },
  { label: 'Outras entradas', value: (r) => r.other_in, format: 'currency' },
  { label: 'Saídas', value: (r) => r.outflows, format: 'currency' },
  { label: 'Saldo', value: (r) => r.net, format: 'currency', strong: true, signed: true },
  { label: 'Acumulado', value: (r) => r.cumulative, format: 'currency', signed: true },
]

/** Cash in and out of the period. Deliberately separate from profit. */
export function CashFlowTab({ query, details }: { query: ReportQuery; details?: ReportDetails }) {
  const flow = useCashFlow(query)
  if (flow.isLoading) return <LoadingRows rows={6} />
  if (flow.error) return <ErrorState error={flow.error} onRetry={flow.refetch} />
  if (!flow.data) return null

  const { totals, series, bucket, from, to } = flow.data
  const profit = details ? sumFields(details.series, ['profit']).profit : null
  const period = bucket === 'month' ? 'mês' : bucket === 'week' ? 'semana' : 'dia'

  return (
    <div className={flow.isFetching ? 'space-y-4 opacity-80' : 'space-y-4'}>
      <StatStrip
        label="Fluxo de caixa do período"
        stats={[
          { label: 'Entradas', value: formatCurrency(totals.inflows), hint: `${formatCurrency(totals.other_in)} fora de vendas` },
          { label: 'Saídas', value: formatCurrency(totals.outflows), hint: 'Compras e despesas' },
          {
            label: 'Saldo',
            value: formatCurrency(totals.balance),
            tone: totals.balance < 0 ? 'negative' : totals.balance > 0 ? 'positive' : undefined,
          },
          ...(profit !== null ? [{ label: 'Lucro das vendas', value: formatCurrency(profit), hint: 'Para comparar' }] : []),
        ]}
      />
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        Saldo de caixa não é lucro. Um rolo de filamento sai inteiro do caixa no dia da compra, mas só vira custo aos
        poucos, conforme as peças são vendidas. Por isso o saldo pode ser negativo num mês de muitas compras e o lucro,
        positivo.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Entradas e saídas</CardTitle>
          <CardDescription>Por {period}. Vendas entram pela data da venda.</CardDescription>
        </CardHeader>
        <CardContent>
          {totals.inflows === 0 && totals.outflows === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação de caixa no período.</p>
          ) : (
            <ColumnsChart data={series} bucket={bucket} series={SERIES} />
          )}
        </CardContent>
      </Card>
      <ReportTable
        title={`Fluxo por ${period}`}
        columns={COLUMNS}
        rows={series}
        rowKey={(r) => r.date}
        bucket={bucket}
        filename={`fluxo-de-caixa_${from}_${to}`}
        totals={['Total', totals.sales_in, totals.other_in, totals.outflows, totals.balance, undefined]}
      />
      <OtherIncomes from={from} to={to} />
    </div>
  )
}
