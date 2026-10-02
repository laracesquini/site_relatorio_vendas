import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import type { CostSheetForm } from './schema'

// Packaging is usually a stock material (it has a purchase cost and runs out), so it
// is not suggested here, to avoid counting it twice.
const SUGGESTIONS = ['Energia', 'Mão de obra', 'Desgaste da impressora']

/** Costs per unit that are not stock materials: energy, labour, machine wear… */
export function ExtraCostRows({ form }: { form: UseFormReturn<CostSheetForm> }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'extras' })
  const errors = form.formState.errors.extras
  const used = new Set(form.getValues('extras').map((e) => e.label.trim().toLowerCase()))

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_8rem_2.25rem] items-start gap-2">
          <div>
            <Input
              {...form.register(`extras.${index}.label`)}
              placeholder="Ex.: Energia"
              aria-label={`Nome do custo ${index + 1}`}
              aria-invalid={Boolean(errors?.[index]?.label)}
            />
            {errors?.[index]?.label && <p className="mt-1 text-xs text-danger">{errors[index]?.label?.message}</p>}
          </div>
          <div>
            <Controller
              control={form.control}
              name={`extras.${index}.amount`}
              render={({ field: f }) => (
                <DecimalInput
                  prefix="R$"
                  fractionDigits="auto"
                  value={f.value}
                  onChange={f.onChange}
                  aria-label={`Valor do custo ${index + 1}`}
                  aria-invalid={Boolean(errors?.[index]?.amount)}
                />
              )}
            />
            {errors?.[index]?.amount && <p className="mt-1 text-xs text-danger">{errors[index]?.amount?.message}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Remover custo ${index + 1}`}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.filter((s) => !used.has(s.toLowerCase())).map((label) => (
          <Button key={label} type="button" variant="outline" size="sm" onClick={() => append({ label, amount: null })}>
            <Plus /> {label}
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => append({ label: '', amount: null })}>
          <Plus /> Outro custo
        </Button>
      </div>
    </div>
  )
}
