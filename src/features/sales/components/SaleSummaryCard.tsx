import type { ReactNode } from 'react'
import { formatCurrency, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SaleSummary } from '@/domain/sale'

function Row({ label, value, detail, strong, tone }: {
  label: string
  value: ReactNode
  detail?: ReactNode
  strong?: boolean
  tone?: 'positive' | 'negative' | 'muted'
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1', strong && 'text-base font-semibold')}>
      <dt className={strong ? undefined : 'text-muted-foreground'}>{label}</dt>
      <dd
        className={cn(
          'text-right tabular-nums',
          tone === 'positive' && 'text-success',
          tone === 'negative' && 'text-danger',
          tone === 'muted' && 'text-muted-foreground',
        )}
      >
        {value}
        {detail && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{detail}</span>}
      </dd>
    </div>
  )
}

/** Live breakdown of a sale, shown before saving. */
export function SaleSummaryCard({ summary }: { summary: SaleSummary }) {
  const profitTone = summary.profit < 0 ? 'negative' : summary.profit > 0 ? 'positive' : undefined

  return (
    <dl className="rounded-lg border bg-muted/40 p-4 text-sm" aria-live="polite">
      <Row label="Preço bruto" value={formatCurrency(summary.gross)} />
      <Row
        label="Taxas"
        value={formatCurrency(summary.fees)}
        detail={summary.feePercent !== null && `(${formatPercent(summary.feePercent)})`}
        tone="muted"
      />
      <Row label="Recebido" value={formatCurrency(summary.received)} />
      <Row
        label="Custo"
        value={formatCurrency(summary.totalCost)}
        detail={summary.quantity > 1 && `(${summary.quantity} × ${formatCurrency(summary.unitCost)})`}
        tone="muted"
      />
      <div className="my-2 border-t" />
      <Row label="Lucro" value={formatCurrency(summary.profit)} strong tone={profitTone} />
      <Row label="Margem" value={formatPercent(summary.margin)} strong tone={profitTone} />
      <Row label="Margem sobre o bruto" value={formatPercent(summary.marginOverGross)} tone="muted" />
    </dl>
  )
}
