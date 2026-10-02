import { describe, expect, it } from 'vitest'
import { marginOf, shareOf, sumFields } from './totals'

describe('report totals', () => {
  it('sums fields exactly', () => {
    const rows = [
      { gross: 0.1, profit: 8.5, margin: null as number | null },
      { gross: 0.2, profit: -2, margin: 10 },
    ]
    expect(sumFields(rows, ['gross', 'profit'])).toEqual({ gross: 0.3, profit: 6.5 })
  })

  it('computes a weighted margin and shares', () => {
    expect(marginOf(68.5, 119.4)).toBe(57.37)
    expect(marginOf(10, 0)).toBeNull()
    expect(shareOf(15.6, 50)).toBe(31.2)
  })
})
