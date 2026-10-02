import { dec } from '@/domain/decimal'

type NumericKeys<T> = { [K in keyof T]: T[K] extends number | null ? K : never }[keyof T]

/** Exact (decimal) sums of the given numeric fields over rows. */
export function sumFields<T, K extends NumericKeys<T>>(rows: T[], keys: K[]): Record<K, number> {
  const out = {} as Record<K, number>
  for (const key of keys) {
    out[key] = rows.reduce((sum, r) => sum.plus((r[key] as number | null) ?? 0), dec(0)).toNumber()
  }
  return out
}

/** profit / received × 100, or null when nothing was received. */
export const marginOf = (profit: number, received: number) =>
  received ? dec(profit).div(received).times(100).toDecimalPlaces(2).toNumber() : null

/** part / whole × 100, or null when the whole is zero. */
export const shareOf = (part: number, whole: number) =>
  whole ? dec(part).div(whole).times(100).toDecimalPlaces(2).toNumber() : null
