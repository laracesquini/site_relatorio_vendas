import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
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
import { deleteOtherIncome, reportKeys, saveOtherIncome, useOtherIncomes, type OtherIncome } from '../api'

/** Money in that is not a sale: classes, repairs, a refund… Counts in cash flow only. */
export function OtherIncomes({ from, to }: { from: string | null; to: string | null }) {
  const incomes = useOtherIncomes(from, to)
  const [editing, setEditing] = useState<OtherIncome | 'new' | null>(null)
  const [deleting, setDeleting] = useState<OtherIncome | null>(null)
  const remove = useAppMutation({
    mutationFn: (i: OtherIncome) => deleteOtherIncome(i.id),
    invalidate: [reportKeys.all],
    successMessage: 'Entrada excluída',
    onSuccess: () => setDeleting(null),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outras entradas</CardTitle>
        <CardDescription>Dinheiro que entrou sem ser venda (aulas, consertos, reembolsos). Não entra no lucro das vendas.</CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> Nova entrada
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {incomes.isLoading ? (
          <LoadingRows rows={2} />
        ) : incomes.error ? (
          <ErrorState error={incomes.error} onRetry={incomes.refetch} />
        ) : incomes.data?.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma outra entrada no período.</p>
        ) : (
          <ul className="divide-y">
            {incomes.data?.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{formatDate(i.income_date)}</span>
                <span className="min-w-0 flex-1 truncate">{i.description}</span>
                <span className="font-medium tabular-nums">{formatCurrency(i.amount)}</span>
                <RowActions onEdit={() => setEditing(i)} onDelete={() => setDeleting(i)} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing !== null && (
            <IncomeForm income={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir esta entrada?"
        description={deleting ? `${deleting.description} · ${formatCurrency(deleting.amount)}. Ela sai do fluxo de caixa; o registro fica no histórico.` : ''}
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </Card>
  )
}

function IncomeForm({ income, onDone }: { income?: OtherIncome; onDone: () => void }) {
  const [date, setDate] = useState(income?.income_date ?? todayISO())
  const [description, setDescription] = useState(income?.description ?? '')
  const [amount, setAmount] = useState<number | null>(income?.amount ?? null)
  const [notes, setNotes] = useState(income?.notes ?? '')
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({})

  const save = useAppMutation({
    mutationFn: () =>
      saveOtherIncome({
        id: income?.id,
        income_date: date,
        description: description.trim(),
        amount: amount!,
        notes: notes.trim() || null,
      }),
    invalidate: [reportKeys.all],
    successMessage: income ? 'Entrada atualizada' : 'Entrada registrada',
    onSuccess: onDone,
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next = {
      description: description.trim() ? undefined : 'Descreva a entrada',
      amount: amount && amount > 0 ? undefined : 'Informe um valor maior que zero',
    }
    setErrors(next)
    if (!next.description && !next.amount) save.mutate(undefined)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{income ? 'Editar entrada' : 'Nova entrada'}</DialogTitle>
        <DialogDescription>Entra no fluxo de caixa do dia informado.</DialogDescription>
      </DialogHeader>
      <Field label="Descrição" htmlFor="inc-desc" error={errors.description}>
        <Input id="inc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Aula de modelagem" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor" htmlFor="inc-amount" error={errors.amount}>
          <DecimalInput id="inc-amount" prefix="R$" value={amount} onChange={setAmount} />
        </Field>
        <Field label="Data" htmlFor="inc-date">
          <Input id="inc-date" type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
        </Field>
      </div>
      <Field label="Observações" htmlFor="inc-notes">
        <Textarea id="inc-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
