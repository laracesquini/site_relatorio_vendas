import { describe, expect, it } from 'vitest'
import { formatDecimalInput, parseDecimal, roundMoney } from './decimal'

describe('parseDecimal', () => {
  it.each([
    ['30,00', 30],
    ['19,4', 19.4],
    ['1.234,56', 1234.56],
    ['R$ 1.234,56', 1234.56],
    ['19.40', 19.4],
    ['1.234', 1234],
    ['0,113900', 0.1139],
    ['15', 15],
    [',5', 0.5],
  ])('parses %s', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected)
  })

  it.each(['', '   ', 'abc', '1,2,3', '12a'])('rejects %j', (input) => {
    expect(parseDecimal(input)).toBeNull()
  })
})

describe('roundMoney', () => {
  it('rounds half away from zero like Postgres', () => {
    expect(roundMoney(2.675)).toBe(2.68) // 2.675 is 2.67499… as a float
    expect(roundMoney('0.125')).toBe(0.13)
    expect(roundMoney(-0.125)).toBe(-0.13)
  })

  it('avoids float drift', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
  })
})

describe('formatDecimalInput', () => {
  it('formats money for inputs', () => {
    expect(formatDecimalInput(1234.5, 2)).toBe('1.234,50')
    expect(formatDecimalInput(null, 2)).toBe('')
  })

  it('keeps precision for unit costs', () => {
    expect(formatDecimalInput(0.1139, 'auto')).toBe('0,1139')
  })
})
