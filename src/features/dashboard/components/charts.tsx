import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBucket, formatCurrency, formatCurrencyCompact, formatDate, formatMonthLong } from '@/lib/format'
import type { SeriesPoint } from '../api'

type Bucket = 'day' | 'month'

const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' }

const bucketTitle = (date: string, bucket: Bucket) =>
  bucket === 'month' ? formatMonthLong(date) : formatDate(date)

type Row = { key: string; label: string; color: string; shape?: 'line' | 'rect' }

/** Tooltip: values lead, series names follow, keyed by a short line in the series color. */
type ChartTooltipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  label?: string | number
  bucket: Bucket
  rows: Row[]
}

function ChartTooltip({ active, payload, label, bucket, rows }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as SeriesPoint
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-elevated">
      <div className="mb-1.5 font-medium capitalize">{bucketTitle(String(label), bucket)}</div>
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className={r.shape === 'rect' ? 'size-2.5 rounded-[2px]' : 'h-0.5 w-3 rounded-full'}
              style={{ background: r.color }}
            />
            {r.label}
          </span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(point[r.key as keyof SeriesPoint] as number)}
          </span>
        </div>
      ))}
    </div>
  )
}

function Legend({ rows }: { rows: Row[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-2">
          <span
            className={r.shape === 'rect' ? 'size-2.5 rounded-[2px]' : 'h-0.5 w-4 rounded-full'}
            style={{ background: r.color }}
          />
          {r.label}
        </li>
      ))}
    </ul>
  )
}

const xAxisProps = (bucket: Bucket, points: number) => ({
  dataKey: 'date',
  tickFormatter: (v: string) => formatBucket(v, bucket),
  tick: AXIS,
  tickLine: false,
  axisLine: { stroke: 'var(--chart-grid)' },
  minTickGap: 16,
  interval: points > 16 ? ('preserveStartEnd' as const) : (0 as const),
})

const yAxisProps = {
  tickFormatter: (v: number) => formatCurrencyCompact(v),
  tick: AXIS,
  tickLine: false,
  axisLine: false,
  width: 72,
}

const REVENUE_ROWS: Row[] = [
  { key: 'gross', label: 'Bruto', color: 'var(--chart-2)' },
  { key: 'received', label: 'Recebido', color: 'var(--chart-1)' },
]

/** Gross vs received over time: the gap between the lines is what fees took. */
export function RevenueChart({ data, bucket }: { data: SeriesPoint[]; bucket: Bucket }) {
  return (
    <>
      <Legend rows={REVENUE_ROWS} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis {...xAxisProps(bucket, data.length)} />
            <YAxis {...yAxisProps} />
            <Tooltip
              cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} bucket={bucket} rows={REVENUE_ROWS} />
              )}
            />
            {REVENUE_ROWS.map((r) => (
              <Area
                key={r.key}
                type="monotone"
                dataKey={r.key}
                name={r.label}
                stroke={r.color}
                strokeWidth={2}
                fill={r.color}
                fillOpacity={r.key === 'received' ? 0.1 : 0}
                activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

const PROFIT_ROWS: Row[] = [{ key: 'profit', label: 'Lucro líquido', color: 'var(--chart-1)', shape: 'rect' }]

type BarShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number | [number, number]
  fill?: string
}

/** Column with a 4px rounded data-end and a square baseline, for positive and negative values. */
function DataEndBar({ x = 0, y = 0, width = 0, height = 0, value = 0, fill }: BarShapeProps) {
  const v = Array.isArray(value) ? value[1] - value[0] : value
  const top = Math.min(y, y + height)
  const h = Math.abs(height)
  if (h === 0 || width === 0) return null
  const r = Math.min(4, h, width / 2)
  const right = x + width
  const bottom = top + h
  const d =
    v >= 0
      ? `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${right - r} Q${right},${top} ${right},${top + r} V${bottom} Z`
      : `M${x},${top} V${bottom - r} Q${x},${bottom} ${x + r},${bottom} H${right - r} Q${right},${bottom} ${right},${bottom - r} V${top} Z`
  return <path d={d} fill={fill} />
}

/** Net profit per day/month; losses go below the zero line. */
export function ProfitChart({ data, bucket }: { data: SeriesPoint[]; bucket: Bucket }) {
  const hasLoss = data.some((d) => d.profit < 0)
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis {...xAxisProps(bucket, data.length)} />
          <YAxis {...yAxisProps} />
          {hasLoss && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1} />}
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
            content={({ active, payload, label }) => (
              <ChartTooltip active={active} payload={payload} label={label} bucket={bucket} rows={PROFIT_ROWS} />
            )}
          />
          <Bar
            dataKey="profit"
            name="Lucro líquido"
            fill="var(--chart-1)"
            maxBarSize={24}
            shape={(props: BarShapeProps) => <DataEndBar {...props} />}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Same values as the time charts, for the table view. */
export function SeriesTable({ data, bucket }: { data: SeriesPoint[]; bucket: Bucket }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
        <tr>
          <th className="py-1.5 font-medium">{bucket === 'month' ? 'Mês' : 'Dia'}</th>
          <th className="py-1.5 text-right font-medium">Bruto</th>
          <th className="py-1.5 text-right font-medium">Recebido</th>
          <th className="py-1.5 text-right font-medium">Custo</th>
          <th className="py-1.5 text-right font-medium">Lucro</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {data.map((d) => (
          <tr key={d.date} className="border-t">
            <td className="py-1.5 capitalize">{bucketTitle(d.date, bucket)}</td>
            <td className="py-1.5 text-right">{formatCurrency(d.gross)}</td>
            <td className="py-1.5 text-right">{formatCurrency(d.received)}</td>
            <td className="py-1.5 text-right">{formatCurrency(d.cost)}</td>
            <td className="py-1.5 text-right">{formatCurrency(d.profit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
