import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PeriodFilter } from '@/components/PeriodFilter'
import type { ProductView } from '@/features/products/model'
import type { Category, Channel } from '@/features/settings/api'
import type { SalesFilterState } from '../useSalesFilters'

const ALL = '__all'

type SalesFiltersProps = {
  state: SalesFilterState
  update: (patch: Partial<SalesFilterState>) => void
  clear: () => void
  activeCount: number
  channels: Channel[]
  products: ProductView[]
  categories: Category[]
}

function OptionSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
  className = 'sm:w-48',
}: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  allLabel: string
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger className={`w-full ${className}`} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function SalesFilters({ state, update, clear, activeCount, channels, products, categories }: SalesFiltersProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={state.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Buscar produto, SKU, cor, personalização…"
            className="pl-9"
            aria-label="Buscar vendas"
          />
        </div>
        <PeriodFilter
          value={state.period}
          customFrom={state.customFrom}
          customTo={state.customTo}
          onChange={update}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <OptionSelect
          label="Canal"
          value={state.channelId}
          onChange={(channelId) => update({ channelId })}
          allLabel="Todos os canais"
          options={channels.map((c) => ({ value: c.id, label: c.name }))}
        />
        <OptionSelect
          label="Produto"
          value={state.productId}
          onChange={(productId) => update({ productId })}
          allLabel="Todos os produtos"
          options={products.map((p) => ({ value: p.id, label: p.name }))}
          className="sm:w-56"
        />
        <OptionSelect
          label="Categoria"
          value={state.categoryId}
          onChange={(categoryId) => update({ categoryId })}
          allLabel="Todas as categorias"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <OptionSelect
          label="Personalizado"
          value={state.customized}
          onChange={(v) => update({ customized: v as SalesFilterState['customized'] })}
          allLabel="Personalizado: todos"
          options={[
            { value: 'yes', label: 'Só personalizados' },
            { value: 'no', label: 'Só não personalizados' },
          ]}
        />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X /> Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
