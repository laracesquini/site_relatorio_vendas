import { useSearchParams } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/PageHeader'
import { PeriodFilter } from '@/components/PeriodFilter'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import type { Bucket } from '@/lib/format'
import { usePeriodParams } from '@/lib/usePeriodParams'
import { useReportDetails, type ReportQuery } from '../api'
import { CashFlowTab } from '../components/CashFlowTab'
import { ChannelsTab } from '../components/ChannelsTab'
import { CostsTab } from '../components/CostsTab'
import { ProductsTab } from '../components/ProductsTab'
import { ResultsTab } from '../components/ResultsTab'

const TABS = [
  { value: 'resultados', label: 'Resultados' },
  { value: 'produtos', label: 'Produtos' },
  { value: 'canais', label: 'Canais' },
  { value: 'custos', label: 'Custos' },
  { value: 'caixa', label: 'Fluxo de caixa' },
] as const
type TabValue = (typeof TABS)[number]['value']

const AUTO = 'auto'
const BUCKETS: { value: Bucket | typeof AUTO; label: string }[] = [
  { value: AUTO, label: 'Agrupar: automático' },
  { value: 'day', label: 'Por dia' },
  { value: 'week', label: 'Por semana' },
  { value: 'month', label: 'Por mês' },
]

export default function ReportsPage() {
  const period = usePeriodParams('thisMonth')
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.value === params.get('aba')) ? params.get('aba') : 'resultados') as TabValue
  const bucketParam = params.get('agrupar')
  const bucket = (['day', 'week', 'month'] as const).find((b) => b === bucketParam) ?? null
  const query: ReportQuery = { from: period.range.from, to: period.range.to, bucket }
  const details = useReportDetails(query)

  const setParam = (name: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Vendas, lucro, custos e caixa do período. Cada tabela pode ser baixada em CSV para o Excel."
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <PeriodFilter
          value={period.period}
          customFrom={period.customFrom}
          customTo={period.customTo}
          onChange={period.update}
        />
        <Select value={bucket ?? AUTO} onValueChange={(v) => setParam('agrupar', v === AUTO ? null : v)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Agrupamento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUCKETS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParam('aba', v === 'resultados' ? null : v)}>
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          {tab === 'caixa' ? (
            <CashFlowTab query={query} details={details.data} />
          ) : details.isLoading ? (
            <LoadingRows rows={8} />
          ) : details.error ? (
            <ErrorState error={details.error} onRetry={details.refetch} />
          ) : details.data ? (
            <div className={details.isFetching ? 'opacity-80 transition-opacity' : 'transition-opacity'}>
              <TabsContent value="resultados">
                <ResultsTab data={details.data} />
              </TabsContent>
              <TabsContent value="produtos">
                <ProductsTab data={details.data} />
              </TabsContent>
              <TabsContent value="canais">
                <ChannelsTab data={details.data} />
              </TabsContent>
              <TabsContent value="custos">
                <CostsTab data={details.data} />
              </TabsContent>
            </div>
          ) : null}
        </div>
      </Tabs>
    </>
  )
}
