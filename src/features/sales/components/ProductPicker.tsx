import { forwardRef, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProductView } from '@/features/products/model'

type ProductPickerProps = {
  id?: string
  products: ProductView[]
  /** Product ids, most recently sold first. */
  recentIds: string[]
  value: string | null
  onChange: (productId: string) => void
  invalid?: boolean
}

const RECENT_COUNT = 6

export const ProductPicker = forwardRef<HTMLButtonElement, ProductPickerProps>(function ProductPicker(
  { id, products, recentIds, value, onChange, invalid },
  ref,
) {
  const [open, setOpen] = useState(false)
  const selected = products.find((p) => p.id === value)
  const byId = new Map(products.map((p) => [p.id, p]))
  const recent = recentIds
    .map((id) => byId.get(id))
    .filter((p): p is ProductView => Boolean(p))
    .slice(0, RECENT_COUNT)
  const recentSet = new Set(recent.map((p) => p.id))
  const others = products.filter((p) => !recentSet.has(p.id))

  function renderItem(p: ProductView) {
    return (
      <CommandItem
        key={p.id}
        value={p.id}
        keywords={[p.name, p.sku, ...p.variants.map((v) => `${v.sku} ${v.label}`)]}
        onSelect={() => {
          onChange(p.id)
          setOpen(false)
        }}
      >
        <Check className={cn('size-4', p.id === value ? 'opacity-100' : 'opacity-0')} />
        <div className="min-w-0 flex-1">
          <div className="truncate">{p.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {p.sku}
            {p.hasVariations && ` · ${p.variants.filter((v) => v.isActive).length} variações`}
          </div>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(p.priceRange[0])}</span>
      </CommandItem>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : 'Selecionar produto'}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome, SKU ou cor…" />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            {recent.length > 0 && <CommandGroup heading="Vendidos recentemente">{recent.map(renderItem)}</CommandGroup>}
            <CommandGroup heading={recent.length > 0 ? 'Todos os produtos' : undefined}>
              {others.map(renderItem)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
