import { Link } from 'react-router-dom'
import {
  Coins,
  Hash,
  Layers,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  Tag,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { PeriodFilter } from '@/components/PeriodFilter'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import type { PeriodPreset } from '@/domain/period'
import { formatCurrency, formatPercent, formatQuantity } from '@/lib/format'
import { usePeriodParams } from '@/lib/usePeriodParams'
import type { Overview } from '../api'
import { ChartCard } from '../components/ChartCard'
import { ProfitChart, RevenueChart, SeriesTable } from '@/components/charts'
import { KpiCard } from '../components/KpiCard'
import { RankedBars } from '../components/RankedBars'
import { StockCard } from '../components/StockCard'
import { useOverview } from '../hooks'

const PRESETS: PeriodPreset[] = ['today', 'last7', 'thisMonth', 'lastMonth', 'custom']

export default function DashboardPage() {
  const period = usePeriodParams('thisMonth')
  const overview = useOverview(period.range.from, period.range.to)

  return (
    <>
      <PageHeader title="Dashboard" description="Como o negócio está indo no período." />

      <div className="mb-4">
        <PeriodFilter
          value={period.period}
          customFrom={period.customFrom}
          customTo={period.customTo}
          onChange={period.update}
          presets={PRESETS}
        />
      </div>

      {overview.isLoading ? (
        <LoadingRows rows={8} />
      ) : overview.error ? (
        <ErrorState error={overview.error} onRetry={overview.refetch} />
      ) : overview.data ? (
        <DashboardContent data={overview.data} isRefreshing={overview.isFetching} />
      ) : null}
    </>
  )
}

export function DashboardContent({ data, isRefreshing }: { data: Overview; isRefreshing: boolean }) {
  const s = data.summary
  const hasSales = s.sales_count > 0
  const hasSeries = data.series.some((p) => p.gross !== 0 || p.profit !== 0)

  return (
    <div className={isRefreshing ? 'space-y-4 opacity-80 transition-opacity' : 'space-y-4 transition-opacity'}>
      <section aria-label="Indicadores" className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Lucro líquido"
            value={formatCurrency(s.profit)}
            icon={TrendingUp}
            hint={`Recebido − custo de produção · margem ${formatPercent(s.margin)}`}
            tone={s.profit < 0 ? 'negative' : undefined}
            emphasis
          />
          <KpiCard
            label="Valor recebido"
            value={formatCurrency(s.received)}
            icon={Wallet}
            hint={`Depois de ${formatCurrency(s.fees)} em taxas`}
            emphasis
          />
          <KpiCard label="Faturamento bruto" value={formatCurrency(s.gross)} icon={Receipt} hint="Pago pelos clientes" emphasis />
          <KpiCard
            label="Resultado do período"
            value={formatCurrency(s.operating_result)}
            icon={Coins}
            hint={`Lucro − ${formatCurrency(s.operational_expenses)} em despesas operacionais`}
            tone={s.operating_result < 0 ? 'negative' : undefined}
            emphasis
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Custo dos produtos vendidos"
            value={formatCurrency(s.cost)}
            icon={Layers}
            hint="Material e produção das peças vendidas"
          />
          <KpiCard
            label="Compras e despesas"
            value={formatCurrency(s.purchases)}
            icon={ShoppingCart}
            hint="Tudo o que foi comprado"
          />
          <KpiCard label="Ticket médio" value={formatCurrency(s.average_ticket)} icon={Tag} hint="Bruto ÷ vendas" />
          <KpiCard label="Margem média" value={formatPercent(s.margin)} icon={Percent} hint="Lucro ÷ recebido" />
          <KpiCard label="Vendas" value={formatQuantity(s.sales_count)} icon={Hash} />
          <KpiCard label="Unidades vendidas" value={formatQuantity(s.units)} icon={Package} />
        </div>
      </section>

      {!hasSales && (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma venda neste período.{' '}
          <Link to="/vendas" className="underline underline-offset-2">
            Ver vendas
          </Link>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Faturamento"
          description={`Bruto e recebido por ${data.bucket === 'month' ? 'mês' : 'dia'}. A distância entre as linhas são as taxas.`}
          isEmpty={!hasSeries}
          table={<SeriesTable data={data.series} bucket={data.bucket} />}
        >
          <RevenueChart data={data.series} bucket={data.bucket} />
        </ChartCard>

        <ChartCard
          title="Lucro líquido"
          description={`Por ${data.bucket === 'month' ? 'mês' : 'dia'}, pelo custo registrado em cada venda.`}
          isEmpty={!hasSeries}
          table={<SeriesTable data={data.series} bucket={data.bucket} />}
        >
          <ProfitChart data={data.series} bucket={data.bucket} />
        </ChartCard>

        <ChartCard title="Vendas por canal" description="Valor recebido em cada canal." isEmpty={data.by_channel.length === 0}>
          <RankedBars
            label="Vendas por canal"
            items={data.by_channel.map((c) => ({
              key: c.channel_id,
              label: c.name,
              value: c.received,
              valueLabel: formatCurrency(c.received),
              details: [
                { label: 'Bruto', value: formatCurrency(c.gross) },
                { label: 'Recebido', value: formatCurrency(c.received) },
                { label: 'Lucro', value: formatCurrency(c.profit) },
                { label: 'Vendas', value: String(c.sales_count) },
              ],
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Custos do período"
          description="Compras e despesas por categoria."
          isEmpty={data.costs_by_category.length === 0}
          emptyText="Nenhuma compra ou despesa no período."
        >
          <RankedBars
            label="Custos por categoria"
            items={data.costs_by_category.map((c) => ({
              key: c.category_id ?? 'none',
              label: c.is_operational ? `${c.name} (operacional)` : c.name,
              value: c.total,
              valueLabel: formatCurrency(c.total),
            }))}
          />
        </ChartCard>

        <ChartCard title="Mais vendidos" description="Por unidades vendidas." isEmpty={data.top_by_units.length === 0}>
          <RankedBars
            label="Produtos mais vendidos"
            items={data.top_by_units.map((p) => ({
              key: p.product_id,
              label: p.name,
              value: p.units,
              valueLabel: `${formatQuantity(p.units)} un`,
              details: [
                { label: 'Recebido', value: formatCurrency(p.received) },
                { label: 'Lucro', value: formatCurrency(p.profit) },
              ],
            }))}
          />
        </ChartCard>

        <ChartCard title="Mais lucrativos" description="Por lucro líquido total." isEmpty={data.top_by_profit.length === 0}>
          <RankedBars
            label="Produtos mais lucrativos"
            items={data.top_by_profit.map((p) => ({
              key: p.product_id,
              label: p.name,
              value: p.profit,
              valueLabel: formatCurrency(p.profit),
              details: [
                { label: 'Unidades', value: formatQuantity(p.units) },
                { label: 'Recebido', value: formatCurrency(p.received) },
              ],
            }))}
          />
        </ChartCard>

        <div className="lg:col-span-2">
          <StockCard />
        </div>

      </div>
    </div>
  )
}
