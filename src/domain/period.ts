import { endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns'

// Date ranges used by filters, as calendar dates (YYYY-MM-DD, inclusive).

export type PeriodPreset = 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'all' | 'custom'

export type DateRange = { from: string | null; to: string | null }

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Hoje',
  last7: 'Últimos 7 dias',
  thisMonth: 'Mês atual',
  lastMonth: 'Mês anterior',
  all: 'Todo o período',
  custom: 'Personalizado',
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

/** Resolves a preset relative to `today` (YYYY-MM-DD, already in Brazil's time zone). */
export function resolvePeriod(preset: PeriodPreset, today: string, custom: DateRange = { from: null, to: null }): DateRange {
  const day = parseISO(today)
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'last7':
      return { from: iso(subDays(day, 6)), to: today }
    case 'thisMonth':
      return { from: iso(startOfMonth(day)), to: iso(endOfMonth(day)) }
    case 'lastMonth': {
      const prev = subMonths(day, 1)
      return { from: iso(startOfMonth(prev)), to: iso(endOfMonth(prev)) }
    }
    case 'all':
      return { from: null, to: null }
    case 'custom': {
      // Accept the dates in either order.
      const { from, to } = custom
      if (from && to && from > to) return { from: to, to: from }
      return { from, to }
    }
  }
}

export const isPeriodPreset = (value: string | null): value is PeriodPreset =>
  value !== null && value in PERIOD_LABELS

/** True when `date` (YYYY-MM-DD) falls inside the range; open ends match anything. */
export const isWithinRange = (date: string, range: DateRange) =>
  (!range.from || date >= range.from) && (!range.to || date <= range.to)

/**
 * Period that shows a given date's whole month, e.g. after saving a record dated
 * outside the current filter: "Mês anterior" when it fits, otherwise that month.
 */
export function periodShowing(
  date: string,
  today: string,
): { period: PeriodPreset; customFrom: string | null; customTo: string | null } {
  if (isWithinRange(date, resolvePeriod('thisMonth', today))) {
    return { period: 'thisMonth', customFrom: null, customTo: null }
  }
  if (isWithinRange(date, resolvePeriod('lastMonth', today))) {
    return { period: 'lastMonth', customFrom: null, customTo: null }
  }
  const month = resolvePeriod('thisMonth', date)
  return { period: 'custom', customFrom: month.from, customTo: month.to }
}
