import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DecimalInput } from '@/components/DecimalInput'
import { Field } from '@/components/Field'
import { dec } from '@/domain/decimal'
import { formatQuantity, formatUnitCost, todayISO } from '@/lib/format'
import { adjustStockTo, registerMovement, type StockTarget } from '../api'
import { useStockMutation } from '../hooks'
import { balanceAfterOut, movementTimestamp } from '../movements'

export type MovementMode = 'IN' | 'OUT' | 'ADJUST'

const TITLES: Record<MovementMode, string> = {
  IN: 'Registrar entrada',
  OUT: 'Registrar saída',
  ADJUST: 'Ajustar pela contagem',
}

const DESCRIPTIONS: Record<MovementMode, string> = {
  IN: 'Para compras, use a tela Compras: ela já dá entrada no estoque. Use esta opção para sobras, doações ou correções.',
  OUT: 'Uso fora de uma venda, amostras, peças com defeito ou perdas.',
  ADJUST: 'Informe quanto há de fato. A diferença é registrada como ajuste.',
}

type MovementDialogProps = {
  target: StockTarget | null
  mode: MovementMode
  onClose: () => void
}

export function MovementDialog({ target, mode, onClose }: MovementDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && <MovementForm key={`${target.id}-${mode}`} target={target} mode={mode} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function MovementForm({ target, mode, onClose }: { target: StockTarget; mode: MovementMode; onClose: () => void }) {
  const [quantity, setQuantity] = useState<number | null>(null)
  const [unitCost, setUnitCost] = useState<number | null>(null)
  const [reason, setReason] = useState<'manual' | 'loss'>('manual')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const save = useStockMutation(
    () => {
      const occurredAt = movementTimestamp(date)
      const trimmed = notes.trim() || null
      if (mode === 'ADJUST') return adjustStockTo({ target, counted: quantity!, notes: trimmed, occurredAt })
      return registerMovement({
        target,
        type: mode,
        quantity: quantity!,
        unitCost: mode === 'IN' ? unitCost : null,
        reason: mode === 'OUT' ? reason : 'manual',
        notes: trimmed,
        occurredAt,
      })
    },
    (result) => (mode === 'ADJUST' && result === null ? 'A contagem confere; nada mudou' : 'Estoque atualizado'),
    onClose,
  )

  const unit = target.unit
  const after =
    quantity === null
      ? null
      : mode === 'IN'
        ? dec(target.currentQty).plus(quantity).toNumber()
        : mode === 'OUT'
          ? balanceAfterOut(target.currentQty, quantity)
          : quantity
  const difference = mode === 'ADJUST' && quantity !== null ? dec(quantity).minus(target.currentQty).toNumber() : null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (quantity === null || (mode !== 'ADJUST' && quantity <= 0) || quantity < 0) {
      setError(mode === 'ADJUST' ? 'Informe a quantidade contada' : 'Informe uma quantidade maior que zero')
      return
    }
    setError(null)
    save.mutate(undefined)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{TITLES[mode]}</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{target.name}</span> · em estoque:{' '}
          {formatQuantity(target.currentQty, unit)}
        </DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">{DESCRIPTIONS[mode]}</p>

      <div className="grid grid-cols-2 gap-4">
        <Field label={mode === 'ADJUST' ? 'Quantidade contada' : 'Quantidade'} htmlFor="mv-qty" error={error ?? undefined}>
          <DecimalInput
            id="mv-qty"
            fractionDigits="auto"
            suffix={unit}
            value={quantity}
            onChange={setQuantity}
            autoFocus
          />
        </Field>
        <Field label="Data" htmlFor="mv-date">
          <Input id="mv-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
        </Field>
      </div>

      {mode === 'IN' && (
        <Field
          label={`Custo por ${unit}`}
          htmlFor="mv-cost"
          hint={`Em branco: usa o custo médio atual (${formatUnitCost(target.avgCost)}), sem alterá-lo.`}
        >
          <DecimalInput id="mv-cost" prefix="R$" fractionDigits="auto" value={unitCost} onChange={setUnitCost} />
        </Field>
      )}

      {mode === 'OUT' && (
        <Field label="Motivo" htmlFor="mv-reason">
          <Select value={reason} onValueChange={(v) => setReason(v as 'manual' | 'loss')}>
            <SelectTrigger id="mv-reason" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Uso / consumo</SelectItem>
              <SelectItem value="loss">Perda ou defeito</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field label="Observações" htmlFor="mv-notes">
        <Textarea id="mv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {after !== null && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
          Estoque depois: <span className="font-medium tabular-nums">{formatQuantity(after, unit)}</span>
          {difference !== null && difference !== 0 && (
            <span className="text-muted-foreground"> (ajuste de {difference > 0 ? '+' : ''}{formatQuantity(difference, unit)})</span>
          )}
        </p>
      )}
      {after !== null && after < 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-soft-warning p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          O estoque ficará negativo. Confira se todas as entradas foram registradas.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Confirmar
        </Button>
      </DialogFooter>
    </form>
  )
}
