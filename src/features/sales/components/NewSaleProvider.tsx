import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { useProducts } from '@/features/products/hooks'
import { useChannels } from '@/features/settings/hooks'
import { useRecentlySoldProductIds } from '../hooks'
import { readLastChannel } from '../lastChannel'
import { NewSaleContext } from '../new-sale-context'
import { NewSaleForm } from './NewSaleForm'

export function NewSaleProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const value = useMemo(() => ({ openNewSale: () => setOpen(true) }), [])

  return (
    <NewSaleContext.Provider value={value}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="px-4 sm:px-6">
            <SheetTitle>Nova venda</SheetTitle>
            <SheetDescription>O lucro é calculado enquanto você preenche.</SheetDescription>
          </SheetHeader>
          {/* Mounted only while open, so every opening starts a fresh form. */}
          {open && <NewSaleLoader onDone={() => setOpen(false)} />}
        </SheetContent>
      </Sheet>
    </NewSaleContext.Provider>
  )
}

function NewSaleLoader({ onDone }: { onDone: () => void }) {
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

  const sellable = (products.data ?? []).filter(
    (p) => p.is_active && !p.archived_at && p.variants.some((v) => v.isActive),
  )
  const activeChannels = (channels.data ?? []).filter((c) => c.is_active)
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
    <NewSaleForm
      products={sellable}
      recentProductIds={recent.data ?? []}
      channels={activeChannels}
      initialChannelId={initialChannel}
      onDone={onDone}
    />
  )
}
