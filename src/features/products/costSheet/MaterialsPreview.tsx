import { AlertTriangle, Layers } from 'lucide-react'
import { dec } from '@/domain/decimal'
import { materialsToDeduct, resolveSheet } from '@/domain/cost'
import { formatQuantity } from '@/lib/format'
import { useCostSheet } from './api'

type MaterialsPreviewProps = {
  productId: string
  variantId: string | null
  /** Pieces sold or produced. */
  units: number
  title: string
}

/** Lists the materials a sale or production will take out of stock. */
export function MaterialsPreview({ productId, variantId, units, title }: MaterialsPreviewProps) {
  const sheet = useCostSheet(productId)
  if (!sheet.data || units <= 0) return null
  const rows = materialsToDeduct(resolveSheet(sheet.data.materials, variantId), units)

  if (rows.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <Layers className="mt-0.5 size-4 shrink-0" />
        Este produto ainda não tem ficha de custo, então nenhum insumo será baixado.
      </p>
    )
  }

  const short = rows.filter((r) => dec(r.item.currentQty).lessThan(r.total))
  return (
    <div className="rounded-lg bg-muted/60 p-3 text-sm">
      <p className="mb-1.5 flex items-center gap-2 font-medium">
        <Layers className="size-4" /> {title}
      </p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between gap-3 tabular-nums">
            <span>{r.item.name}</span>
            <span>
              −{formatQuantity(r.total, r.item.unit)}
              <span className="ml-2 text-xs text-muted-foreground">
                (tem {formatQuantity(r.item.currentQty, r.item.unit)})
              </span>
            </span>
          </li>
        ))}
      </ul>
      {short.length > 0 && (
        <p className="mt-2 flex items-start gap-2 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
          Estoque insuficiente de {short.map((r) => r.item.name).join(', ')}. O registro é feito mesmo assim e o
          estoque fica negativo.
        </p>
      )}
    </div>
  )
}
