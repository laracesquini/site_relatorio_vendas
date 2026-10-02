import Decimal from 'decimal.js-light'

// All money math on the client goes through Decimal, never raw floats.
// Rounding matches Postgres round(): half away from zero.
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }

export type DecimalInput = Decimal | number | string

export const dec = (value: DecimalInput | null | undefined) => new Decimal(value ?? 0)

/** Rounds to 2 decimals (money) and returns a plain number for display/transport. */
export const roundMoney = (value: DecimalInput) => dec(value).toDecimalPlaces(2).toNumber()

/** Rounds to 6 decimals (unit costs such as R$/g). */
export const roundUnitCost = (value: DecimalInput) => dec(value).toDecimalPlaces(6).toNumber()

/**
 * Parses a number typed in pt-BR ("1.234,56", "19,4", "0,5") or plain ("19.40").
 * Returns null for empty or invalid input.
 */
export function parseDecimal(input: string): number | null {
  let s = input.trim().replace(/^R\$\s*/, '').replace(/\s/g, '')
  if (s === '') return null
  if (s.includes(',')) {
    // pt-BR: dots are thousand separators, comma is the decimal separator
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" typed as thousands
    s = s.replace(/\./g, '')
  }
  if (!/^-?\d*\.?\d+$/.test(s) && !/^-?\d+\.$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const inputFormatters = new Map<number, Intl.NumberFormat>()

/** Formats a number for an input field: 1234.5 → "1.234,50" (money) or "1.234,5". */
export function formatDecimalInput(value: number | null | undefined, fractionDigits: number | 'auto') {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  const key = fractionDigits === 'auto' ? -1 : fractionDigits
  let f = inputFormatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(
      'pt-BR',
      fractionDigits === 'auto'
        ? { maximumFractionDigits: 6 }
        : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits },
    )
    inputFormatters.set(key, f)
  }
  return f.format(value)
}
