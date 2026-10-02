import type { ReactNode } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadCsv, toCsv } from '@/lib/csv'
import {
  formatBucketTitle,
  formatCurrency,
  formatPercent,
  formatQuantity,
  type Bucket,
} from '@/lib/format'
import { cn } from '@/lib/utils'

export type ColumnFormat = 'currency' | 'percent' | 'number' | 'text' | 'bucket'

/**
 * One column definition drives both the on-screen table and the CSV export,
 * so the two always agree (and an Excel export can reuse it later).
 */
export type ReportColumn<T> = {
  label: string
  value: (row: T) => number | string | null
  format?: ColumnFormat
  /** Visual emphasis (e.g. the profit column). */
  strong?: boolean
  /** Red when negative. */
  signed?: boolean
}

type ReportTableProps<T> = {
  title: string
  description?: ReactNode
  columns: ReportColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Values for a totals row, by column index (omit a cell with undefined). */
  totals?: Array<number | string | null | undefined>
  bucket?: Bucket
  /** File name for the CSV download, without extension. */
  filename: string
  emptyText?: string
}

function display(value: number | string | null, format: ColumnFormat = 'text', bucket: Bucket = 'day') {
  if (value === null || value === undefined) return '—'
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return formatPercent(value)
    case 'number':
      return formatQuantity(value)
    case 'bucket':
      return formatBucketTitle(String(value), bucket)
    default:
      return String(value)
  }
}

const isNumeric = (f?: ColumnFormat) => f === 'currency' || f === 'percent' || f === 'number'

export function ReportTable<T>({
  title,
  description,
  columns,
  rows,
  rowKey,
  totals,
  bucket,
  filename,
  emptyText = 'Sem dados no período.',
}: ReportTableProps<T>) {
  function exportCsv() {
    const csv = toCsv(
      columns.map((c) => ({
        label: c.format === 'currency' ? `${c.label} (R$)` : c.format === 'percent' ? `${c.label} (%)` : c.label,
        // Bucket dates are exported as readable names; numbers stay numbers.
        value: (row: T) => (c.format === 'bucket' ? display(c.value(row), 'bucket', bucket) : c.value(row)),
      })),
      rows,
    )
    downloadCsv(filename, csv)
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {rows.length > 0 && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download /> CSV
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="max-h-[32rem] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.label} className={cn(isNumeric(c.format) && 'text-right')}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((c) => {
                      const v = c.value(row)
                      return (
                        <TableCell
                          key={c.label}
                          className={cn(
                            isNumeric(c.format) && 'text-right tabular-nums',
                            c.format === 'bucket' && 'whitespace-nowrap first-letter:uppercase',
                            c.strong && 'font-medium',
                            c.signed && typeof v === 'number' && v < 0 && 'text-danger',
                          )}
                        >
                          {display(v, c.format, bucket)}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
              {totals && (
                <TableFooter className="sticky bottom-0 bg-muted">
                  <TableRow>
                    {columns.map((c, i) => {
                      const v = totals[i]
                      return (
                        <TableCell
                          key={c.label}
                          className={cn('font-semibold', isNumeric(c.format) && 'text-right tabular-nums')}
                        >
                          {v === undefined ? '' : i === 0 && typeof v === 'string' ? v : display(v, c.format, bucket)}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
