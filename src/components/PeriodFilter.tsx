import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PERIOD_LABELS, type PeriodPreset } from '@/domain/period'

type PeriodFilterProps = {
  value: PeriodPreset
  customFrom: string | null
  customTo: string | null
  onChange: (patch: { period?: PeriodPreset; customFrom?: string | null; customTo?: string | null }) => void
  presets?: PeriodPreset[]
}

const DEFAULT_PRESETS: PeriodPreset[] = ['today', 'last7', 'thisMonth', 'lastMonth', 'all', 'custom']

/** Period selector (Hoje, Últimos 7 dias, Mês atual…) with a custom date range. */
export function PeriodFilter({ value, customFrom, customTo, onChange, presets = DEFAULT_PRESETS }: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={(v) => onChange({ period: v as PeriodPreset })}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Período">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p} value={p}>
              {PERIOD_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value === 'custom' && (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            type="date"
            aria-label="Data inicial"
            value={customFrom ?? ''}
            onChange={(e) => onChange({ customFrom: e.target.value || null })}
            className="sm:w-40"
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            aria-label="Data final"
            value={customTo ?? ''}
            onChange={(e) => onChange({ customTo: e.target.value || null })}
            className="sm:w-40"
          />
        </div>
      )}
    </div>
  )
}
