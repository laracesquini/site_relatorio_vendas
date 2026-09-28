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
import { formatBucket, formatBucketTitle, formatCurrency, formatCurrencyCompact, type Bucket } from '@/lib/format'

// Time-series charts shared by the Dashboard and Relatórios. Colors come from
// the validated --chart-* palette; text always uses text tokens.

export type { Bucket }

/** A point in time plus numeric values, e.g. { date, gross, received }. */
export type TimePoint = { date: string } & Record<string, number | string | null>

export type Series = {
  key: string
  label: string
  color: string
}

const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' }

type ChartTooltipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  label?: string | number
  bucket: Bucket
  series: Series[]
  shape: 'line' | 'rect'
}

/** Values lead, series names follow, keyed by a short mark in the series color. */
function ChartTooltip({ active, payload, label, bucket, series, shape }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as TimePoint
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-elevated">
      <div className="mb-1.5 font-medium first-letter:uppercase">{formatBucketTitle(String(label), bucket)}</div>
      {series.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className={shape === 'rect' ? 'size-2.5 rounded-[2px]' : 'h-0.5 w-3 rounded-full'}
              style={{ background: s.color }}
            />
            {s.label}
          </span>
          <span className="font-semibold tabular-nums">{formatCurrency(point[s.key] as number)}</span>
        </div>
      ))}
    </div>
  )
}

/** Legend for two or more series (a single series is named by the card title). */
export function ChartLegend({ series, shape }: { series: Series[]; shape: 'line' | 'rect' }) {
  if (series.length < 2) return null
  return (
    <ul className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={shape === 'rect' ? 'size-2.5 rounded-[2px]' : 'h-0.5 w-4 rounded-full'}
            style={{ background: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

const xAxisProps = (bucket: Bucket, points: number) => ({
  dataKey: 'date',
  // Room for the first and last labels, so they are never clipped.
  padding: { left: 12, right: 12 },
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

/** Lines over time; the first series gets a light area wash. */
export function LinesChart({ data, bucket, series }: { data: TimePoint[]; bucket: Bucket; series: Series[] }) {
  return (
    <>
      <ChartLegend series={series} shape="line" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis {...xAxisProps(bucket, data.length)} />
            <YAxis {...yAxisProps} />
            <Tooltip
              cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} bucket={bucket} series={series} shape="line" />
              )}
            />
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={i === series.length - 1 ? 0.1 : 0}
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

type BarShapeProps = {
  payload?: Record<string, unknown>
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

type ColumnsChartProps = {
  data: TimePoint[]
  bucket: Bucket
  series: Series[]
  /** Stack the series (parts of a whole) instead of placing them side by side. */
  stacked?: boolean
}

/** Columns over time: one or more series, side by side or stacked; negatives go below zero. */
export function ColumnsChart({ data, bucket, series, stacked = false }: ColumnsChartProps) {
  const hasNegative = data.some((d) => series.some((s) => Number(d[s.key] ?? 0) < 0))
  return (
    <>
      <ChartLegend series={series} shape="rect" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={stacked ? 2 : '20%'} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis {...xAxisProps(bucket, data.length)} />
            <YAxis {...yAxisProps} />
            {hasNegative && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1} />}
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} bucket={bucket} series={series} shape="rect" />
              )}
            />
            {series.map((s, i) => {
              // In a stack, only the segment that is on top in that column gets the rounded end.
              const isTopIn = (point?: Record<string, unknown>) =>
                !stacked || series.slice(i + 1).every((later) => !Number(point?.[later.key] ?? 0))
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  stackId={stacked ? 'stack' : undefined}
                  maxBarSize={24}
                  // Surface-colored edge = the 2px gap between stacked segments.
                  stroke={stacked ? 'var(--card)' : undefined}
                  strokeWidth={stacked ? 1 : 0}
                  shape={(props: BarShapeProps) =>
                    isTopIn(props.payload) ? (
                      <DataEndBar {...props} />
                    ) : (
                      <rect x={props.x} y={props.y} width={props.width} height={props.height} fill={props.fill} />
                    )
                  }
                  isAnimationActive={false}
                />
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

// Dashboard presets ------------------------------------------------------------

const REVENUE_SERIES: Series[] = [
  { key: 'gross', label: 'Bruto', color: 'var(--chart-2)' },
  { key: 'received', label: 'Recebido', color: 'var(--chart-1)' },
]

/** Gross vs received over time: the gap between the lines is what fees took. */
export function RevenueChart({ data, bucket }: { data: TimePoint[]; bucket: Bucket }) {
  return <LinesChart data={data} bucket={bucket} series={REVENUE_SERIES} />
}

const PROFIT_SERIES: Series[] = [{ key: 'profit', label: 'Lucro líquido', color: 'var(--chart-1)' }]

/** Net profit per period; losses go below the zero line. */
export function ProfitChart({ data, bucket }: { data: TimePoint[]; bucket: Bucket }) {
  return <ColumnsChart data={data} bucket={bucket} series={PROFIT_SERIES} />
}

/** Same values as the dashboard time charts, for the table view. */
export function SeriesTable({ data, bucket }: { data: TimePoint[]; bucket: Bucket }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
        <tr>
          <th className="py-1.5 font-medium">{bucket === 'month' ? 'Mês' : bucket === 'week' ? 'Semana' : 'Dia'}</th>
          <th className="py-1.5 text-right font-medium">Bruto</th>
          <th className="py-1.5 text-right font-medium">Recebido</th>
          <th className="py-1.5 text-right font-medium">Custo</th>
          <th className="py-1.5 text-right font-medium">Lucro</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {data.map((d) => (
          <tr key={d.date} className="border-t">
            <td className="py-1.5 first-letter:uppercase">{formatBucketTitle(d.date, bucket)}</td>
            <td className="py-1.5 text-right">{formatCurrency(d.gross as number)}</td>
            <td className="py-1.5 text-right">{formatCurrency(d.received as number)}</td>
            <td className="py-1.5 text-right">{formatCurrency(d.cost as number)}</td>
            <td className="py-1.5 text-right">{formatCurrency(d.profit as number)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
