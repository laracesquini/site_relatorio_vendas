import { useState, type ReactNode } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ChartCardProps = {
  title: string
  description?: string
  /** The chart; replaced by `table` when the reader switches to the table view. */
  children: ReactNode
  /** Accessible table with the same values as the chart. */
  table?: ReactNode
  isEmpty?: boolean
  emptyText?: string
  /** Dim while a new period loads, keeping the previous render. */
  isRefreshing?: boolean
}

export function ChartCard({
  title,
  description,
  children,
  table,
  isEmpty,
  emptyText = 'Sem dados no período.',
  isRefreshing,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {table && !isEmpty && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={showTable ? 'Ver gráfico' : 'Ver tabela'}
              aria-pressed={showTable}
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? <BarChart3 /> : <Table2 />}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className={isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {isEmpty ? (
          <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">{emptyText}</p>
        ) : showTable ? (
          <div className="max-h-72 overflow-auto">{table}</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
