import { Plus, ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useRecentSales } from '../hooks'
import { useNewSale } from '../new-sale-context'

export default function SalesPage() {
  const { openNewSale } = useNewSale()
  const sales = useRecentSales()

  return (
    <>
      <PageHeader
        title="Vendas"
        description="Registre vendas e acompanhe o lucro de cada uma."
        actions={
          <Button onClick={openNewSale}>
            <Plus /> Nova venda
          </Button>
        }
      />

      {sales.isLoading ? (
        <LoadingRows rows={5} />
      ) : sales.error ? (
        <ErrorState error={sales.error} onRetry={sales.refetch} />
      ) : sales.data?.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhuma venda registrada"
          description="Registre sua primeira venda: o sistema calcula taxas, custo e lucro na hora."
          action={
            <Button onClick={openNewSale}>
              <Plus /> Nova venda
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Últimas vendas</CardTitle>
            <CardDescription>
              As 10 vendas registradas mais recentemente. A lista completa, com filtros e edição, chega na etapa 5.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.data?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="tabular-nums">{formatDate(s.sale_date)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{s.product_name}</div>
                      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        {s.variant_label && <span>{s.variant_label}</span>}
                        {s.is_customized && <Badge variant="outline">Personalizado</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{s.channel_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.gross_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.received_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.total_cost)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium tabular-nums',
                        (s.profit ?? 0) < 0 && 'text-danger',
                      )}
                    >
                      {formatCurrency(s.profit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(s.margin)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
