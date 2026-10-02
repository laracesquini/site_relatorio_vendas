import { useEffect } from 'react'
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DecimalInput } from '@/components/DecimalInput'
import { Field } from '@/components/Field'
import { formatCurrency } from '@/lib/format'
import { dec } from '@/domain/decimal'
import { useCategoryOptions, useSuppliers, useUnits } from '@/features/settings/hooks'
import { saveInventoryItem, type InventoryItem } from '../api'
import { useStockMutation } from '../hooks'

const NONE = '__none'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome'),
  category_id: z.string().nullable(),
  unit_id: z.string({ error: 'Selecione a unidade' }).min(1, 'Selecione a unidade'),
  min_qty: z.number().min(0, 'Não pode ser negativo').nullable(),
  supplier_id: z.string().nullable(),
  notes: z.string(),
  initial_qty: z.number().min(0, 'Não pode ser negativo').nullable(),
  initial_unit_cost: z.number().min(0, 'Não pode ser negativo').nullable(),
})
type Values = z.infer<typeof schema>
type FormState = Omit<Values, 'unit_id'> & { unit_id: string | null }

const toForm = (item?: InventoryItem): FormState => ({
  name: item?.name ?? '',
  category_id: item?.category_id ?? null,
  unit_id: item?.unit_id ?? null,
  min_qty: item?.min_qty || null,
  supplier_id: item?.supplier_id ?? null,
  notes: item?.notes ?? '',
  initial_qty: null,
  initial_unit_cost: null,
})

type ItemFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Item being edited; omit to create one. */
  item?: InventoryItem
  /** Called with the saved item's id (e.g. to select it in a purchase). */
  onSaved?: (id: string) => void
}

export function ItemFormDialog({ open, onOpenChange, item, onSaved }: ItemFormDialogProps) {
  const units = useUnits()
  const categories = useCategoryOptions('material')
  const suppliers = useSuppliers()
  const form = useForm<FormState, unknown, Values>({
    resolver: zodResolver(schema) as unknown as Resolver<FormState, unknown, Values>,
    defaultValues: toForm(item),
  })
  const { errors } = form.formState

  useEffect(() => {
    if (open) form.reset(toForm(item))
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [unitId, initialQty, initialCost] = useWatch({
    control: form.control,
    name: ['unit_id', 'initial_qty', 'initial_unit_cost'],
  })
  const unitCode = units.data?.find((u) => u.id === unitId)?.code ?? ''

  const save = useStockMutation(
    (v: Values) =>
      saveInventoryItem({
        id: item?.id,
        name: v.name.trim(),
        category_id: v.category_id,
        unit_id: v.unit_id,
        min_qty: v.min_qty ?? 0,
        supplier_id: v.supplier_id,
        notes: v.notes.trim() || null,
        ...(item ? {} : { initial_qty: v.initial_qty, initial_unit_cost: v.initial_unit_cost }),
      }),
    item ? 'Insumo atualizado' : 'Insumo cadastrado',
    (id) => {
      onOpenChange(false)
      onSaved?.(id)
    },
  )

  const optionalSelect = (
    name: 'category_id' | 'supplier_id',
    label: string,
    options: { id: string; name: string }[],
    emptyLabel: string,
  ) => (
    <Field label={label} htmlFor={name}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
            <SelectTrigger id={name} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{emptyLabel}</SelectItem>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar insumo' : 'Novo insumo'}</DialogTitle>
          <DialogDescription>
            Materiais usados na produção: filamentos, argolas, fontes, embalagens…
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
          <Field label="Nome" htmlFor="item-name" error={errors.name?.message}>
            <Input id="item-name" {...form.register('name')} placeholder="Ex.: PLA Preto" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Unidade"
              htmlFor="unit"
              error={errors.unit_id?.message}
              hint={!item ? 'Filamento: use gramas (g).' : undefined}
            >
              <Controller
                control={form.control}
                name="unit_id"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="unit" className="w-full" aria-invalid={Boolean(errors.unit_id)}>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.data?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              label="Estoque mínimo"
              htmlFor="min_qty"
              error={errors.min_qty?.message}
              hint="Abaixo disso: estoque baixo."
            >
              <Controller
                control={form.control}
                name="min_qty"
                render={({ field }) => (
                  <DecimalInput
                    id="min_qty"
                    fractionDigits="auto"
                    suffix={unitCode}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0"
                  />
                )}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {optionalSelect('category_id', 'Categoria', categories.data ?? [], 'Sem categoria')}
            {optionalSelect(
              'supplier_id',
              'Fornecedor',
              (suppliers.data ?? []).filter((s) => !s.archived_at || s.id === item?.supplier_id),
              'Nenhum',
            )}
          </div>

          {!item && (
            <fieldset className="space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Estoque inicial (opcional)</legend>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantidade atual" htmlFor="initial_qty" error={errors.initial_qty?.message}>
                  <Controller
                    control={form.control}
                    name="initial_qty"
                    render={({ field }) => (
                      <DecimalInput
                        id="initial_qty"
                        fractionDigits="auto"
                        suffix={unitCode}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                      />
                    )}
                  />
                </Field>
                <Field
                  label={`Custo por ${unitCode || 'unidade'}`}
                  htmlFor="initial_unit_cost"
                  error={errors.initial_unit_cost?.message}
                >
                  <Controller
                    control={form.control}
                    name="initial_unit_cost"
                    render={({ field }) => (
                      <DecimalInput
                        id="initial_unit_cost"
                        prefix="R$"
                        fractionDigits="auto"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0,00"
                      />
                    )}
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                {initialQty && initialCost
                  ? `Valor em estoque: ${formatCurrency(dec(initialQty).times(initialCost).toNumber())}. `
                  : ''}
                O custo define o custo médio inicial. Ex.: rolo de 1 kg por R$ 113,90 = R$ 0,1139 por g.
              </p>
            </fieldset>
          )}

          <Field label="Observações" htmlFor="item-notes">
            <Textarea id="item-notes" rows={2} {...form.register('notes')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
