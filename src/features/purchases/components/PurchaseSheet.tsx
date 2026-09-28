import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { useInventoryItems } from '@/features/inventory/hooks'
import { useCategories, useSuppliers } from '@/features/settings/hooks'
import { usePurchaseLines } from '../hooks'
import { emptyPurchaseForm, fromPurchaseLines } from '../schema'
import { PurchaseForm } from './PurchaseForm'

export type PurchaseSheetMode = { kind: 'new' } | { kind: 'edit'; purchaseId: string } | null

export function PurchaseSheet({ mode, onClose }: { mode: PurchaseSheetMode; onClose: () => void }) {
  const editing = mode?.kind === 'edit'
  return (
    <Sheet open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="px-4 sm:px-6">
          <SheetTitle>{editing ? 'Editar compra' : 'Nova compra ou despesa'}</SheetTitle>
          <SheetDescription>
            {editing
              ? 'As entradas de estoque desta compra são refeitas com os novos valores.'
              : 'Materiais comprados entram no estoque; despesas ficam só no financeiro.'}
          </SheetDescription>
        </SheetHeader>
        {mode && (
          <PurchaseFormLoader
            key={mode.kind === 'edit' ? mode.purchaseId : 'new'}
            purchaseId={mode.kind === 'edit' ? mode.purchaseId : undefined}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function PurchaseFormLoader({ purchaseId, onDone }: { purchaseId?: string; onDone: () => void }) {
  const items = useInventoryItems()
  const categories = useCategories()
  const suppliers = useSuppliers()
  const lines = usePurchaseLines(purchaseId)

  const queries = [items, categories, suppliers, ...(purchaseId ? [lines] : [])]
  if (queries.some((q) => q.isLoading)) {
    return (
      <div className="p-6">
        <LoadingRows rows={6} />
      </div>
    )
  }
  const failed = queries.find((q) => q.error)
  if (failed) {
    return (
      <div className="p-6">
        <ErrorState error={failed.error} onRetry={() => queries.forEach((q) => q.refetch())} />
      </div>
    )
  }

  return (
    <PurchaseForm
      initial={purchaseId ? fromPurchaseLines(lines.data ?? []) : emptyPurchaseForm()}
      purchaseId={purchaseId}
      items={items.data ?? []}
      categories={(categories.data ?? []).filter((c) => c.kind !== 'product' && !c.archived_at)}
      suppliers={suppliers.data ?? []}
      onDone={onDone}
    />
  )
}
