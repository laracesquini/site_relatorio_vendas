import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { Field } from '@/components/Field'
import { SwitchField } from '@/components/SwitchField'

export type SimpleField =
  | { name: string; label: string; type: 'text' | 'textarea'; required?: boolean; hint?: string; maxLength?: number }
  | { name: string; label: string; type: 'switch'; hint?: string }

export type SimpleValues = Record<string, string | boolean>

type SimpleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: SimpleField[]
  defaultValues: SimpleValues
  pending?: boolean
  onSubmit: (values: SimpleValues) => void
}

/** Small create/edit dialog for settings records with a few text and switch fields. */
export function SimpleFormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  defaultValues,
  pending,
  onSubmit,
}: SimpleFormDialogProps) {
  const form = useForm<SimpleValues>({ defaultValues })

  useEffect(() => {
    if (open) form.reset(defaultValues)
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = form.handleSubmit((values) => {
    const trimmed: SimpleValues = {}
    for (const [key, value] of Object.entries(values)) {
      trimmed[key] = typeof value === 'string' ? value.trim() : value
    }
    onSubmit(trimmed)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {fields.map((field) =>
            field.type === 'switch' ? (
              <Controller
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: f }) => (
                  <SwitchField
                    label={field.label}
                    hint={field.hint}
                    checked={Boolean(f.value)}
                    onCheckedChange={f.onChange}
                  />
                )}
              />
            ) : (
              <Field
                key={field.name}
                label={field.label}
                htmlFor={`f-${field.name}`}
                hint={field.hint}
                error={form.formState.errors[field.name]?.message as string | undefined}
              >
                {field.type === 'textarea' ? (
                  <Textarea id={`f-${field.name}`} rows={3} {...form.register(field.name)} />
                ) : (
                  <Input
                    id={`f-${field.name}`}
                    maxLength={field.maxLength}
                    {...form.register(field.name, {
                      validate: (v) =>
                        !field.required || String(v ?? '').trim() !== '' || 'Campo obrigatório',
                    })}
                  />
                )}
              </Field>
            ),
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
