import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { useProducts } from '@/features/products/hooks'
import { useChannels } from '@/features/settings/hooks'
import type { SaleLine } from '../api'
import { useRecentlySoldProductIds } from '../hooks'
import { readLastChannel } from '../lastChannel'
import { SaleSheetContext, type SaleSheetState } from '../sale-sheet-context'
import { SaleForm } from './SaleForm'

type SheetMode = { kind: 'new' } | { kind: 'edit'; line: SaleLine } | null

export function SaleSheetProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SheetMode>(null)
  const value = useMemo<SaleSheetState>(
    () => ({
      openNewSale: () => setMode({ kind: 'new' }),
      openEditSale: (line) => setMode({ kind: 'edit', line }),
    }),
    [],
  )
  const editing = mode?.kind === 'edit' ? mode.line : undefined

  return (
    <SaleSheetContext.Provider value={value}>
      {children}
      <Sheet open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="px-4 sm:px-6">
            <SheetTitle>{editing ? 'Editar venda' : 'Nova venda'}</SheetTitle>
            <SheetDescription>
              {editing
                ? 'O estoque baixado por esta venda é devolvido e baixado de novo com os novos valores.'
                : 'O lucro é calculado enquanto você preenche.'}
            </SheetDescription>
          </SheetHeader>
          {/* Mounted only while open, so every opening starts a fresh form. */}
          {mode && (
            <SaleFormLoader key={editing?.id ?? 'new'} editing={editing} onDone={() => setMode(null)} />
          )}
        </SheetContent>
      </Sheet>
    </SaleSheetContext.Provider>
  )
}

function SaleFormLoader({ editing, onDone }: { editing?: SaleLine; onDone: () => void }) {
  const products = useProducts()
  const channels = useChannels()
  const recent = useRecentlySoldProductIds()

  if (products.isLoading || channels.isLoading) {
    return (
      <div className="p-6">
        <LoadingRows rows={6} />
      </div>
    )
  }
  if (products.error || channels.error) {
    return (
      <div className="p-6">
        <ErrorState
          error={products.error ?? channels.error}
          onRetry={() => {
            products.refetch()
            channels.refetch()
          }}
        />
      </div>
    )
  }

  if (editing && (editing.sale_item_count ?? 1) > 1) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Esta venda tem mais de um produto e ainda não pode ser editada por aqui. Você pode excluí-la e registrá-la
        novamente.
      </p>
    )
  }

  // When editing, the sale's own product and channel stay available even if
  // they were deactivated or archived since.
  const sellable = (products.data ?? []).filter(
    (p) =>
      p.id === editing?.product_id ||
      (p.is_active && !p.archived_at && p.variants.some((v) => v.isActive)),
  )
  const activeChannels = (channels.data ?? []).filter((c) => c.is_active || c.id === editing?.channel_id)
  const last = readLastChannel()
  const initialChannel = activeChannels.find((c) => c.id === last)?.id ?? activeChannels[0]?.id ?? null

  if (sellable.length === 0 || activeChannels.length === 0) {
    return (
      <div className="space-y-3 p-6 text-sm">
        <p>
          {sellable.length === 0
            ? 'Cadastre pelo menos um produto ativo para registrar vendas.'
            : 'Ative pelo menos um canal de venda em Configurações.'}
        </p>
        <Button asChild onClick={onDone}>
          <Link to={sellable.length === 0 ? '/produtos/novo' : '/configuracoes'}>
            {sellable.length === 0 ? 'Cadastrar produto' : 'Abrir Configurações'}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <SaleForm
      products={sellable}
      recentProductIds={recent.data ?? []}
      channels={activeChannels}
      initialChannelId={initialChannel}
      editing={editing}
      onDone={onDone}
    />
  )
}
