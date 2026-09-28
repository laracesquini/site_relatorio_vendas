import { cn } from '@/lib/utils'

export type Stat = { label: string; value: string; hint?: string; tone?: 'negative' | 'positive' }

export function StatStrip({ stats, label }: { stats: Stat[]; label: string }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label={label}>
      {stats.map((s) => (
        <div key={s.label} className="min-w-0 rounded-lg border bg-card px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{s.label}</dt>
          <dd
            className={cn(
              'truncate text-base font-semibold tabular-nums',
              s.tone === 'negative' && 'text-danger',
              s.tone === 'positive' && 'text-success',
            )}
          >
            {s.value}
          </dd>
          {s.hint && <dd className="truncate text-xs text-muted-foreground">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}
