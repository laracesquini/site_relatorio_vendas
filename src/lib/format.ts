// pt-BR formatting helpers. Money values arrive from the database as numbers
// (numeric columns); these functions only format, they never do arithmetic.

const TIME_ZONE = 'America/Sao_Paulo'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percent = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const quantity = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

type Numeric = number | string | null | undefined

function toNumber(value: Numeric) {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Axis labels: R$ 950, R$ 1,2 mil, R$ 3,4 mi */
export function formatCurrencyCompact(value: Numeric) {
  const n = toNumber(value)
  if (n === null) return '—'
  return Math.abs(n) < 1000 ? currency.format(n).replace(/,00$/, '') : compactCurrency.format(n)
}

/** R$ 1.234,56 */
export function formatCurrency(value: Numeric) {
  const n = toNumber(value)
  return n === null ? '—' : currency.format(n)
}

const unitCost = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/** Cost per unit keeps up to 4 decimals: R$ 0,1139 (per gram), R$ 9,9975. */
export function formatUnitCost(value: Numeric) {
  const n = toNumber(value)
  return n === null ? '—' : unitCost.format(n)
}

/** 43,81% — expects a value already in percent (43.81, not 0.4381). */
export function formatPercent(value: Numeric) {
  const n = toNumber(value)
  return n === null ? '—' : `${percent.format(n)}%`
}

/** 1.000 g, 2,5 kg */
export function formatQuantity(value: Numeric, unit?: string) {
  const n = toNumber(value)
  if (n === null) return '—'
  return unit ? `${quantity.format(n)} ${unit}` : quantity.format(n)
}

/** '2026-09-28' or a timestamp → 28/09/2026 (calendar dates are not shifted by time zone). */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    return `${d}/${m}/${y}`
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE }).format(new Date(value))
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export type Bucket = 'day' | 'week' | 'month'

/** Axis label: '2026-09-02' → 02/09 (day or week start) or set/26 (month). */
export function formatBucket(value: string, bucket: Bucket) {
  const [y, m, d] = value.slice(0, 10).split('-')
  return bucket === 'month' ? `${MONTHS[Number(m) - 1]}/${y.slice(2)}` : `${d}/${m}`
}

/** '2026-09-01' → setembro de 2026 */
export function formatMonthLong(value: string) {
  const [y, m] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  )
}

/** Full name of a bucket: 02/09/2026, semana de 31/08/2026, setembro de 2026. */
export function formatBucketTitle(value: string, bucket: Bucket) {
  if (bucket === 'month') return formatMonthLong(value)
  if (bucket === 'week') return `semana de ${formatDate(value)}`
  return formatDate(value)
}

/** 28/09/2026 14:05 */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

/** Today's date in Brazil as YYYY-MM-DD (what the database expects). */
export function todayISO(now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}
