import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { formatDecimalInput, parseDecimal } from '@/domain/decimal'
import { cn } from '@/lib/utils'

type DecimalInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: number | null | undefined
  onChange: (value: number | null) => void
  /** 2 for money; 'auto' keeps up to 6 decimals (unit costs, quantities). */
  fractionDigits?: number | 'auto'
  /** Text shown inside the field on the left, e.g. "R$". */
  prefix?: string
  /** Text shown inside the field on the right, e.g. "g". */
  suffix?: string
}

/**
 * Number field that accepts pt-BR input ("1.234,56") and reformats on blur.
 * The parsed value is reported on every keystroke so live calculations update.
 */
export function DecimalInput({
  value,
  onChange,
  fractionDigits = 2,
  prefix,
  suffix,
  className,
  onBlur,
  onFocus,
  ...props
}: DecimalInputProps) {
  const [text, setText] = useState<string | null>(null)
  const display = text ?? formatDecimalInput(value, fractionDigits)

  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
          {prefix}
        </span>
      )}
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        className={cn('tabular-nums', prefix && 'pl-9', suffix && 'pr-10', className)}
        onFocus={(e) => {
          setText(formatDecimalInput(value, fractionDigits === 2 ? 'auto' : fractionDigits))
          onFocus?.(e)
        }}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseDecimal(e.target.value))
        }}
        onBlur={(e) => {
          setText(null)
          onBlur?.(e)
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}
