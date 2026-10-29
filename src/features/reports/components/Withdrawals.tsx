import { useState } from 'react'
import { Loader2, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DecimalInput } from '@/components/DecimalInput'
import { Field } from '@/components/Field'
import { ErrorState, LoadingRows } from '@/components/QueryState'
import { RowActions } from '@/components/RowActions'
import { useAppMutation } from '@/lib/api'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import {
  deleteWithdrawal,
  reportKeys,
  saveWithdrawal,
  useCashFlow,
  useWithdrawals,
  type CashWithdrawal,
} from '../api'

const ALL_TIME = { from: null, to: null, bucket: 'month' } as const

/** Money taken out of the cash (a share of what was sold). Lowers the cash balance, never the profit. */
export function Withdrawals({ from, to }: { from: string | null; to: string | null }) {
  const withdrawals = useWithdrawals(from, to)
  const cash = useCashFlow(ALL_TIME)
  const inCash = cash.data?.totals.balance ?? null
  const [editing, setEditing] = useState<CashWithdrawal | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CashWithdrawal | null>(null)
  const remove = useAppMutation({
    mutationFn: (w: CashWithdrawal) => deleteWithdrawal(w.id),
    invalidate: [reportKeys.all],
    successMessage: 'Retirada excluída',
    onSuccess: () => setDeleting(null),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retiradas</CardTitle>
        <CardDescription>
          Dinheiro tirado do caixa, como a sua parte do que foi vendido. Diminui o caixa, não o lucro das vendas.
          {inCash !== null && (
            <>
              {' '}Em caixa hoje: <strong className="tabular-nums text-foreground">{formatCurrency(inCash)}</strong>.
            </>
          )}
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Minus /> Nova retirada
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {withdrawals.isLoading ? (
          <LoadingRows rows={2} />
        ) : withdrawals.error ? (
          <ErrorState error={withdrawals.error} onRetry={withdrawals.refetch} />
        ) : withdrawals.data?.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma retirada no período.</p>
        ) : (
          <ul className="divide-y">
            {withdrawals.data?.map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{formatDate(w.withdrawal_date)}</span>
                <span className="min-w-0 flex-1 truncate">{w.description}</span>
                <span className="font-medium tabular-nums">{formatCurrency(w.amount)}</span>
                <RowActions onEdit={() => setEditing(w)} onDelete={() => setDeleting(w)} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing !== null && (
            <WithdrawalForm
              withdrawal={editing === 'new' ? undefined : editing}
              inCash={inCash}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir esta retirada?"
        description={deleting ? `${deleting.description} · ${formatCurrency(deleting.amount)}. O valor volta para o caixa; o registro fica no histórico.` : ''}
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </Card>
  )
}

function WithdrawalForm({
  withdrawal,
  inCash,
  onDone,
}: {
  withdrawal?: CashWithdrawal
  inCash: number | null
  onDone: () => void
}) {
  const [date, setDate] = useState(withdrawal?.withdrawal_date ?? todayISO())
  const [description, setDescription] = useState(withdrawal?.description ?? 'Retirada')
  const [amount, setAmount] = useState<number | null>(withdrawal?.amount ?? null)
  const [notes, setNotes] = useState(withdrawal?.notes ?? '')
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({})

  // When editing, the current amount is already out of the cash.
  const available = inCash === null ? null : inCash + (withdrawal?.amount ?? 0)
  const exceeds = available !== null && amount !== null && amount > available

  const save = useAppMutation({
    mutationFn: () =>
      saveWithdrawal({
        id: withdrawal?.id,
        withdrawal_date: date,
        description: description.trim(),
        amount: amount!,
        notes: notes.trim() || null,
      }),
    invalidate: [reportKeys.all],
    successMessage: withdrawal ? 'Retirada atualizada' : 'Retirada registrada',
    onSuccess: onDone,
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next = {
      description: description.trim() ? undefined : 'Descreva a retirada',
      amount: amount && amount > 0 ? undefined : 'Informe um valor maior que zero',
    }
    setErrors(next)
    if (!next.description && !next.amount) save.mutate(undefined)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{withdrawal ? 'Editar retirada' : 'Nova retirada'}</DialogTitle>
        <DialogDescription>
          Sai do caixa no dia informado.
          {available !== null && <> Disponível: {formatCurrency(available)}.</>}
        </DialogDescription>
      </DialogHeader>
      <Field label="Descrição" htmlFor="wd-desc" error={errors.description}>
        <Input id="wd-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Pró-labore de setembro" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor" htmlFor="wd-amount" error={errors.amount}>
          <DecimalInput id="wd-amount" prefix="R$" value={amount} onChange={setAmount} />
        </Field>
        <Field label="Data" htmlFor="wd-date">
          <Input id="wd-date" type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
        </Field>
      </div>
      {exceeds && (
        <p role="status" className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          O valor é maior que o disponível em caixa. O saldo vai ficar negativo.
        </p>
      )}
      <Field label="Observações" htmlFor="wd-notes">
        <Textarea id="wd-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}
