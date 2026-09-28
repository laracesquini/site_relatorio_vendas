import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type RankedItem = {
  key: string
  label: string
  value: number
  /** Text at the bar tip (the formatted value). */
  valueLabel: string
  /** Extra lines shown on hover/focus. */
  details?: { label: string; value: string }[]
}

/**
 * Horizontal ranked bars in one hue (magnitude, not identity). Values sit at
 * the bar tip; negative values (e.g. a product sold at a loss) get an empty bar.
 */
export function RankedBars({ items, label }: { items: RankedItem[]; label: string }) {
  const max = Math.max(0, ...items.map((i) => i.value))

  return (
    <ol className="space-y-2.5" aria-label={label}>
      {items.map((item) => {
        const width = max > 0 && item.value > 0 ? Math.max(2, (item.value / max) * 100) : 0
        return (
          <li key={item.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  className="group rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{item.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">{item.valueLabel}</span>
                  </div>
                  <div className="h-2.5 bg-muted">
                    <div
                      className="h-full rounded-r-[4px] bg-chart-1 transition-[filter] group-hover:brightness-110"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              {item.details && (
                <TooltipContent side="top" align="start">
                  <div className="font-medium">{item.label}</div>
                  {item.details.map((d) => (
                    <div key={d.label} className="flex justify-between gap-4 tabular-nums">
                      <span className="opacity-80">{d.label}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </TooltipContent>
              )}
            </Tooltip>
          </li>
        )
      })}
    </ol>
  )
}
