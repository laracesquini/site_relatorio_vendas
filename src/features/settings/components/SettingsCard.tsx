import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingRows } from '@/components/QueryState'

type SettingsCardProps = {
  title: string
  description: string
  addLabel?: string
  onAdd?: () => void
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  isEmpty?: boolean
  emptyText?: string
  children: ReactNode
}

export function SettingsCard({
  title,
  description,
  addLabel = 'Adicionar',
  onAdd,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyText = 'Nenhum item cadastrado.',
  children,
}: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {onAdd && (
          <CardAction>
            <Button size="sm" onClick={onAdd}>
              <Plus /> {addLabel}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingRows rows={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : isEmpty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  )
}

type SettingsRowProps = {
  title: ReactNode
  subtitle?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  muted?: boolean
}

export function SettingsRow({ title, subtitle, badges, actions, muted }: SettingsRowProps) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className={muted ? 'min-w-0 flex-1 opacity-60' : 'min-w-0 flex-1'}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{title}</span>
          {badges}
        </div>
        {subtitle && <div className="truncate text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  )
}
