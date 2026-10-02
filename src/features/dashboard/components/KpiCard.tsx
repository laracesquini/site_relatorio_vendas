import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type KpiCardProps = {
  label: string
  value: string
  icon: LucideIcon
  /** Short explanation below the value (what the number means). */
  hint?: ReactNode
  tone?: 'positive' | 'negative'
  /** Headline indicators get a larger value; the rest are compact. */
  emphasis?: boolean
}

export function KpiCard({ label, value, icon: Icon, hint, tone, emphasis }: KpiCardProps) {
  return (
    <div className={cn('min-w-0 rounded-xl border bg-card shadow-card', emphasis ? 'p-4' : 'p-3 sm:p-4')}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <div
        className={cn(
          'mt-2 truncate font-heading font-semibold tabular-nums',
          emphasis ? 'text-3xl' : 'text-lg sm:text-xl',
          tone === 'negative' && 'text-danger',
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
