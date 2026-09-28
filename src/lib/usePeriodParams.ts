import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isPeriodPreset, resolvePeriod, type DateRange, type PeriodPreset } from '@/domain/period'
import { todayISO } from './format'

export type PeriodState = { period: PeriodPreset; customFrom: string | null; customTo: string | null }

/** Period filter kept in the URL (?periodo=lastMonth or ?periodo=custom&de=…&ate=…). */
export function usePeriodParams(defaultPeriod: PeriodPreset = 'thisMonth') {
  const [params, setParams] = useSearchParams()

  const state = useMemo<PeriodState>(() => {
    const period = params.get('periodo')
    return {
      period: isPeriodPreset(period) ? period : defaultPeriod,
      customFrom: params.get('de'),
      customTo: params.get('ate'),
    }
  }, [params, defaultPeriod])

  const range = useMemo<DateRange>(
    () => resolvePeriod(state.period, todayISO(), { from: state.customFrom, to: state.customTo }),
    [state],
  )

  function update(patch: Partial<PeriodState>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const set = (name: string, value: string | null | undefined) =>
          value ? next.set(name, value) : next.delete(name)
        if (patch.period !== undefined) set('periodo', patch.period === defaultPeriod ? null : patch.period)
        if (patch.customFrom !== undefined) set('de', patch.customFrom)
        if (patch.customTo !== undefined) set('ate', patch.customTo)
        return next
      },
      { replace: true },
    )
  }

  return { ...state, range, update }
}
