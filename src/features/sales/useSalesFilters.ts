import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isPeriodPreset, resolvePeriod, type PeriodPreset } from '@/domain/period'
import { todayISO } from '@/lib/format'
import type { SaleLineFilters } from './api'

// Filters live in the URL (?periodo=thisMonth&canal=…) so a reload or a
// shared link keeps them.

export type SalesFilterState = {
  period: PeriodPreset
  customFrom: string | null
  customTo: string | null
  channelId: string | null
  productId: string | null
  categoryId: string | null
  customized: 'yes' | 'no' | null
  search: string
}

const PARAMS: Record<keyof SalesFilterState, string> = {
  period: 'periodo',
  customFrom: 'de',
  customTo: 'ate',
  channelId: 'canal',
  productId: 'produto',
  categoryId: 'categoria',
  customized: 'personalizado',
  search: 'busca',
}

export const DEFAULT_PERIOD: PeriodPreset = 'thisMonth'

export function useSalesFilters() {
  const [params, setParams] = useSearchParams()

  const state = useMemo<SalesFilterState>(() => {
    const period = params.get(PARAMS.period)
    const customized = params.get(PARAMS.customized)
    return {
      period: isPeriodPreset(period) ? period : DEFAULT_PERIOD,
      customFrom: params.get(PARAMS.customFrom),
      customTo: params.get(PARAMS.customTo),
      channelId: params.get(PARAMS.channelId),
      productId: params.get(PARAMS.productId),
      categoryId: params.get(PARAMS.categoryId),
      customized: customized === 'yes' || customized === 'no' ? customized : null,
      search: params.get(PARAMS.search) ?? '',
    }
  }, [params])

  const query = useMemo<SaleLineFilters>(() => {
    const range = resolvePeriod(state.period, todayISO(), { from: state.customFrom, to: state.customTo })
    return {
      ...range,
      channelId: state.channelId,
      productId: state.productId,
      categoryId: state.categoryId,
      customized: state.customized === null ? null : state.customized === 'yes',
    }
  }, [state])

  function update(patch: Partial<SalesFilterState>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch) as [keyof SalesFilterState, unknown][]) {
          const name = PARAMS[key]
          const isDefault = key === 'period' && value === DEFAULT_PERIOD
          if (value === null || value === '' || isDefault) next.delete(name)
          else next.set(name, String(value))
        }
        return next
      },
      { replace: true },
    )
  }

  const activeCount =
    [state.channelId, state.productId, state.categoryId, state.customized].filter(Boolean).length +
    (state.search ? 1 : 0)

  return {
    state,
    query,
    update,
    activeCount,
    clear: () => setParams(new URLSearchParams(), { replace: true }),
  }
}
