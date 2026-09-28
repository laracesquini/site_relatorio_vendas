import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type RowActionsProps = {
  onEdit?: () => void
  /** Archive/restore toggle; `archived` is the current state. */
  onToggleArchive?: () => void
  archived?: boolean
  archiveLabel?: string
  restoreLabel?: string
  onDelete?: () => void
}

export function RowActions({
  onEdit,
  onToggleArchive,
  archived,
  archiveLabel = 'Arquivar',
  restoreLabel = 'Restaurar',
  onDelete,
}: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> Editar
          </DropdownMenuItem>
        )}
        {onToggleArchive && (
          <DropdownMenuItem onSelect={onToggleArchive}>
            {archived ? <ArchiveRestore /> : <Archive />}
            {archived ? restoreLabel : archiveLabel}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
