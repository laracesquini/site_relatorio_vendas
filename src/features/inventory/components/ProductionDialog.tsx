import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DecimalInput } from '@/components/DecimalInput'
import { Field } from '@/components/Field'
import { formatQuantity, todayISO } from '@/lib/format'
import { MaterialsPreview } from '@/features/products/costSheet/MaterialsPreview'
import { registerProduction, type FinishedGood } from '../api'
import { useStockMutation } from '../hooks'

type ProductionDialogProps = {
  variant: FinishedGood | null
  onClose: () => void
}

/** Finished units produced ahead of sales: consumes the cost sheet's materials, adds units. */
export function ProductionDialog({ variant, onClose }: ProductionDialogProps) {
  return (
    <Dialog open={variant !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {variant && <ProductionForm key={variant.id} variant={variant} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function ProductionForm({ variant, onClose }: { variant: FinishedGood; onClose: () => void }) {
  const [quantity, setQuantity] = useState<number | null>(null)
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const save = useStockMutation(
    () => registerProduction({ variantId: variant.id, quantity: quantity!, date, notes: notes.trim() || null }),
    'Produção registrada',
    onClose,
  )

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      setError('Informe um número inteiro de peças')
      return
    }
    setError(null)
    save.mutate(undefined)
  }

  const name = variant.label ? `${variant.productName} · ${variant.label}` : variant.productName

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Registrar produção</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{name}</span> · em estoque: {formatQuantity(variant.currentQty)} un
        </DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        As peças entram no estoque pronto e os insumos da ficha de custo são baixados. O custo das peças fica
        registrado com o custo médio atual dos insumos.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Peças produzidas" htmlFor="prod-qty" error={error ?? undefined}>
          <DecimalInput id="prod-qty" fractionDigits={0} suffix="un" value={quantity} onChange={setQuantity} autoFocus />
        </Field>
        <Field label="Data" htmlFor="prod-date">
          <Input id="prod-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
        </Field>
      </div>
      <MaterialsPreview
        productId={variant.productId}
        variantId={variant.id}
        units={quantity ?? 0}
        title="Insumos que serão consumidos"
      />
      <Field label="Observações" htmlFor="prod-notes">
        <Textarea id="prod-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Registrar
        </Button>
      </DialogFooter>
    </form>
  )
}
