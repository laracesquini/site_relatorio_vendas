import { useState } from 'react'
import { History } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/EmptyState'
import { PeriodFilter } from '@/components/PeriodFilter'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { resolvePeriod, type PeriodPreset } from '@/domain/period'
import { todayISO } from '@/lib/format'
import { MOVEMENTS_SHOWN_LIMIT } from '../api'
import { useMovements } from '../hooks'
import type { MovementType } from '../movements'
import { MovementsTable } from './MovementsTable'

const ALL = '__all'

/** Every stock movement: purchases, sales, production, manual entries and counts. */
export function MovementsTab() {
  const [period, setPeriod] = useState<{ period: PeriodPreset; customFrom: string | null; customTo: string | null }>({
    period: 'thisMonth',
    customFrom: null,
    customTo: null,
  })
  const [kind, setKind] = useState<'material' | 'product' | null>(null)
  const [type, setType] = useState<MovementType | null>(null)
  const range = resolvePeriod(period.period, todayISO(), { from: period.customFrom, to: period.customTo })
  const movements = useMovements({ kind, type, from: range.from, to: range.to })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <PeriodFilter
          value={period.period}
          customFrom={period.customFrom}
          customTo={period.customTo}
          onChange={(patch) => setPeriod((p) => ({ ...p, ...patch }))}
        />
        <Select value={kind ?? ALL} onValueChange={(v) => setKind(v === ALL ? null : (v as 'material' | 'product'))}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Tipo de item">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Insumos e produtos</SelectItem>
            <SelectItem value="material">Só insumos</SelectItem>
            <SelectItem value="product">Só produtos prontos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type ?? ALL} onValueChange={(v) => setType(v === ALL ? null : (v as MovementType))}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Tipo de movimentação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            <SelectItem value="IN">Entradas</SelectItem>
            <SelectItem value="OUT">Saídas</SelectItem>
            <SelectItem value="ADJUSTMENT">Ajustes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {movements.isLoading ? (
        <LoadingRows rows={8} />
      ) : movements.error ? (
        <ErrorState error={movements.error} onRetry={movements.refetch} />
      ) : !movements.data?.length ? (
        <EmptyState icon={History} title="Nenhuma movimentação no período" />
      ) : (
        <>
          <MovementsTable rows={movements.data} />
          {movements.data.length >= MOVEMENTS_SHOWN_LIMIT && (
            <p className="text-xs text-muted-foreground">
              Mostrando as {MOVEMENTS_SHOWN_LIMIT} mais recentes. Use um período menor para ver as anteriores.
            </p>
          )}
        </>
      )}
    </div>
  )
}
