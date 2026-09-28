import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppMutation } from '@/lib/api'
import { createVariationValue, settingsKeys, type VariationValue } from '../api'

type AddVariationValueProps = {
  typeId: string
  typeName: string
  onCreated?: (value: VariationValue) => void
  /** Use when rendered inside another <form> (e.g. the product form). */
  nested?: boolean
}

export function AddVariationValue({ typeId, typeName, onCreated, nested }: AddVariationValueProps) {
  const [value, setValue] = useState('')
  const create = useAppMutation({
    mutationFn: (v: string) => createVariationValue(typeId, v),
    invalidate: [settingsKeys.variations],
    onSuccess: (created) => {
      setValue('')
      onCreated?.(created)
    },
  })

  function submit() {
    const trimmed = value.trim()
    if (trimmed && !create.isPending) create.mutate(trimmed)
  }

  const input = (
    <>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e: KeyboardEvent) => {
          if (nested && e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={`Nova ${typeName.toLowerCase()}`}
        className="h-8 w-40"
        aria-label={`Novo valor de ${typeName}`}
      />
      <Button
        type={nested ? 'button' : 'submit'}
        size="icon-sm"
        variant="outline"
        disabled={!value.trim() || create.isPending}
        aria-label="Adicionar valor"
        onClick={nested ? submit : undefined}
      >
        <Plus />
      </Button>
    </>
  )

  if (nested) return <div className="flex items-center gap-1">{input}</div>
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        submit()
      }}
    >
      {input}
    </form>
  )
}
