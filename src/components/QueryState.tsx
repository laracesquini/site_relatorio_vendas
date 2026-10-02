import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toErrorMessage } from '@/lib/errors'

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-soft-danger px-6 py-10 text-center"
    >
      <AlertCircle className="size-6 text-danger" />
      <p className="text-sm">{toErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
