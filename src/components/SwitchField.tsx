import type { ReactNode } from 'react'
import { Switch } from '@/components/ui/switch'

type SwitchFieldProps = {
  label: string
  hint?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

/** A switch with its label and explanation, in a bordered row. */
export function SwitchField({ label, hint, checked, onCheckedChange, disabled }: SwitchFieldProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3 has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  )
}
