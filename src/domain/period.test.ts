import { describe, expect, it } from 'vitest'
import { isWithinRange, periodShowing, resolvePeriod } from './period'

const today = '2026-09-28'

describe('resolvePeriod', () => {
  it('resolves today and the last 7 days (inclusive)', () => {
    expect(resolvePeriod('today', today)).toEqual({ from: today, to: today })
    expect(resolvePeriod('last7', today)).toEqual({ from: '2026-09-22', to: today })
  })

  it('resolves the current and previous month', () => {
    expect(resolvePeriod('thisMonth', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(resolvePeriod('lastMonth', today)).toEqual({ from: '2026-08-01', to: '2026-08-31' })
  })

  it('handles January and leap years', () => {
    expect(resolvePeriod('lastMonth', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(resolvePeriod('thisMonth', '2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })

  it('returns an open range for "all"', () => {
    expect(resolvePeriod('all', today)).toEqual({ from: null, to: null })
  })

  it('uses custom dates, swapping them if reversed', () => {
    expect(resolvePeriod('custom', today, { from: '2026-09-10', to: '2026-09-01' })).toEqual({
      from: '2026-09-01',
      to: '2026-09-10',
    })
    expect(resolvePeriod('custom', today, { from: '2026-09-10', to: null })).toEqual({
      from: '2026-09-10',
      to: null,
    })
  })
})

describe('periodShowing', () => {
  it('keeps the current month, uses "Mês anterior" when it fits, otherwise that month', () => {
    expect(periodShowing('2026-09-10', today)).toEqual({ period: 'thisMonth', customFrom: null, customTo: null })
    expect(periodShowing('2026-08-31', today)).toEqual({ period: 'lastMonth', customFrom: null, customTo: null })
    expect(periodShowing('2026-06-15', today)).toEqual({ period: 'custom', customFrom: '2026-06-01', customTo: '2026-06-30' })
    expect(isWithinRange('2026-08-31', { from: '2026-09-01', to: '2026-09-30' })).toBe(false)
    expect(isWithinRange('2026-08-31', { from: null, to: null })).toBe(true)
  })
})
