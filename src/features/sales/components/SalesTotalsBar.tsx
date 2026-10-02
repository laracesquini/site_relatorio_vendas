import { formatCurrency, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SalesTotals } from '@/domain/sale'

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'truncate text-base font-semibold tabular-nums',
          tone === 'positive' && 'text-success',
          tone === 'negative' && 'text-danger',
        )}
      >
        {value}
      </div>
    </div>
  )
}

/** Totals of the sales currently shown (after filters and search). */
export function SalesTotalsBar({ totals }: { totals: SalesTotals }) {
  const tone = totals.profit < 0 ? 'negative' : totals.profit > 0 ? 'positive' : undefined
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7" aria-label="Totais das vendas filtradas">
      <Stat label="Bruto" value={formatCurrency(totals.gross)} />
      <Stat label="Taxas" value={formatCurrency(totals.fees)} />
      <Stat label="Recebido" value={formatCurrency(totals.received)} />
      <Stat label="Custos" value={formatCurrency(totals.cost)} />
      <Stat label="Lucro" value={formatCurrency(totals.profit)} tone={tone} />
      <Stat label="Margem" value={formatPercent(totals.margin)} tone={tone} />
      <Stat label="Unidades" value={`${totals.units} em ${totals.lines} ${totals.lines === 1 ? 'venda' : 'vendas'}`} />
    </div>
  )
}
