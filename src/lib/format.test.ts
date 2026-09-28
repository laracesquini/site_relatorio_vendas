import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatPercent, formatQuantity, todayISO } from './format'

// Intl uses a non-breaking space between "R$" and the number.
const plain = (s: string) => s.replaceAll(String.fromCharCode(160), ' ')

describe('format', () => {
  it('formats money as R$ 1.234,56', () => {
    expect(plain(formatCurrency(1234.56))).toBe('R$ 1.234,56')
    expect(plain(formatCurrency('19.4'))).toBe('R$ 19,40')
    expect(plain(formatCurrency(-5))).toBe('-R$ 5,00')
    expect(formatCurrency(null)).toBe('—')
  })

  it('formats percentages with two decimals', () => {
    expect(formatPercent(43.8144)).toBe('43,81%')
    expect(formatPercent(undefined)).toBe('—')
  })

  it('formats quantities with their unit', () => {
    expect(formatQuantity(1000, 'g')).toBe('1.000 g')
    expect(formatQuantity(2.5, 'kg')).toBe('2,5 kg')
  })

  it('formats calendar dates as DD/MM/YYYY without time zone shifts', () => {
    expect(formatDate('2026-09-01')).toBe('01/09/2026')
  })

  it('gives today in Brazil, not UTC', () => {
    // 01:30 UTC on the 29th is still the 28th in São Paulo (UTC-3)
    expect(todayISO(new Date('2026-09-29T01:30:00Z'))).toBe('2026-09-28')
  })
})
