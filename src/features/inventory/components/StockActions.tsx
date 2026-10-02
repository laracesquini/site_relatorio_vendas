import { ArrowDownToLine, ArrowUpFromLine, Factory, History, MoreHorizontal, Pencil, Scale } from 'lucide-react'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MovementMode } from './MovementDialog'

type StockActionsProps = {
  onMove: (mode: MovementMode) => void
  onHistory: () => void
  onProduce?: () => void
  onEdit?: () => void
  onToggleArchive?: () => void
  archived?: boolean
  onDelete?: () => void
}

export function StockActions({ onMove, onHistory, onProduce, onEdit, onToggleArchive, archived, onDelete }: StockActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onProduce && (
          <DropdownMenuItem onSelect={onProduce}>
            <Factory /> Registrar produção
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onMove('IN')}>
          <ArrowDownToLine /> Entrada
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onMove('OUT')}>
          <ArrowUpFromLine /> Saída
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onMove('ADJUST')}>
          <Scale /> Ajustar pela contagem
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onHistory}>
          <History /> Histórico
        </DropdownMenuItem>
        {(onEdit || onToggleArchive || onDelete) && <DropdownMenuSeparator />}
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> Editar
          </DropdownMenuItem>
        )}
        {onToggleArchive && (
          <DropdownMenuItem onSelect={onToggleArchive}>
            {archived ? <ArchiveRestore /> : <Archive />}
            {archived ? 'Restaurar' : 'Arquivar'}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
