import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { formatQuantity, formatUnitCost } from '@/lib/format'
import type { StockTarget } from '../api'
import { useMovements } from '../hooks'
import { MovementsTable } from './MovementsTable'

/** Movement history of one material or finished product. */
export function HistorySheet({ target, onClose }: { target: StockTarget | null; onClose: () => void }) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-3xl">
        {target && (
          <>
            <SheetHeader>
              <SheetTitle>{target.name}</SheetTitle>
              <SheetDescription>
                Em estoque: {formatQuantity(target.currentQty, target.unit)} · custo médio {formatUnitCost(target.avgCost)}
                /{target.unit}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <HistoryList target={target} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function HistoryList({ target }: { target: StockTarget }) {
  const movements = useMovements(
    target.kind === 'material' ? { inventoryItemId: target.id } : { productVariantId: target.id },
  )
  if (movements.isLoading) return <LoadingRows rows={5} />
  if (movements.error) return <ErrorState error={movements.error} onRetry={movements.refetch} />
  if (!movements.data?.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
  }
  return <MovementsTable rows={movements.data} showItem={false} />
}
