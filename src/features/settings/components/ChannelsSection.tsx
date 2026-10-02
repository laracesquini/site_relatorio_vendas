import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAppMutation } from '@/lib/api'
import { deleteChannel, saveChannel, settingsKeys, type Channel } from '../api'
import { useChannels } from '../hooks'
import { RowActions } from '@/components/RowActions'
import { SettingsCard, SettingsRow } from './SettingsCard'
import { SimpleFormDialog } from './SimpleFormDialog'

export function ChannelsSection() {
  const channels = useChannels()
  const [editing, setEditing] = useState<Channel | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Channel | null>(null)
  const invalidate = [settingsKeys.channels]

  const save = useAppMutation({
    mutationFn: saveChannel,
    invalidate,
    successMessage: 'Canal salvo',
    onSuccess: () => setEditing(null),
  })
  const toggle = useAppMutation({
    mutationFn: (c: Channel) => saveChannel({ id: c.id, name: c.name, is_active: !c.is_active }),
    invalidate,
    successMessage: (_, c) => (c.is_active ? 'Canal desativado' : 'Canal ativado'),
  })
  const remove = useAppMutation({
    mutationFn: (c: Channel) => deleteChannel(c.id),
    invalidate,
    successMessage: 'Canal excluído',
    onSuccess: () => setDeleting(null),
  })

  const current = editing === 'new' ? null : editing

  return (
    <>
      <SettingsCard
        title="Canais de venda"
        description="Onde você vende. Canais inativos não aparecem ao registrar novas vendas."
        addLabel="Novo canal"
        onAdd={() => setEditing('new')}
        isLoading={channels.isLoading}
        error={channels.error}
        onRetry={channels.refetch}
        isEmpty={channels.data?.length === 0}
      >
        {channels.data?.map((c) => (
          <SettingsRow
            key={c.id}
            title={c.name}
            muted={!c.is_active}
            badges={!c.is_active && <Badge variant="secondary">Inativo</Badge>}
            actions={
              <RowActions
                onEdit={() => setEditing(c)}
                onToggleArchive={() => toggle.mutate(c)}
                archived={!c.is_active}
                archiveLabel="Desativar"
                restoreLabel="Ativar"
                onDelete={() => setDeleting(c)}
              />
            }
          />
        ))}
      </SettingsCard>

      <SimpleFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={current ? 'Editar canal' : 'Novo canal'}
        fields={[
          { name: 'name', label: 'Nome', type: 'text', required: true },
          { name: 'is_active', label: 'Ativo', type: 'switch' },
        ]}
        defaultValues={{ name: current?.name ?? '', is_active: current?.is_active ?? true }}
        pending={save.isPending}
        onSubmit={(v) =>
          save.mutate({ id: current?.id, name: String(v.name), is_active: Boolean(v.is_active) })
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="Só é possível excluir canais sem vendas. Para canais já usados, desative-os."
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
