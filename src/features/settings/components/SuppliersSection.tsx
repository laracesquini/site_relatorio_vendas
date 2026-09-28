import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAppMutation } from '@/lib/api'
import { deleteSupplier, saveSupplier, setSupplierArchived, settingsKeys, type Supplier } from '../api'
import { useSuppliers } from '../hooks'
import { RowActions } from '@/components/RowActions'
import { SettingsCard, SettingsRow } from './SettingsCard'
import { SimpleFormDialog } from './SimpleFormDialog'

export function SuppliersSection() {
  const suppliers = useSuppliers()
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Supplier | null>(null)
  const invalidate = [settingsKeys.suppliers]

  const save = useAppMutation({
    mutationFn: saveSupplier,
    invalidate,
    successMessage: 'Fornecedor salvo',
    onSuccess: () => setEditing(null),
  })
  const archive = useAppMutation({
    mutationFn: (s: Supplier) => setSupplierArchived(s.id, !s.archived_at),
    invalidate,
    successMessage: (_, s) => (s.archived_at ? 'Fornecedor restaurado' : 'Fornecedor arquivado'),
  })
  const remove = useAppMutation({
    mutationFn: (s: Supplier) => deleteSupplier(s.id),
    invalidate,
    successMessage: 'Fornecedor excluído',
    onSuccess: () => setDeleting(null),
  })

  const current = editing === 'new' ? null : editing

  return (
    <>
      <SettingsCard
        title="Fornecedores"
        description="Opcional: de quem você compra filamentos, componentes e embalagens."
        addLabel="Novo fornecedor"
        onAdd={() => setEditing('new')}
        isLoading={suppliers.isLoading}
        error={suppliers.error}
        onRetry={suppliers.refetch}
        isEmpty={suppliers.data?.length === 0}
        emptyText="Nenhum fornecedor cadastrado."
      >
        {suppliers.data?.map((s) => (
          <SettingsRow
            key={s.id}
            title={s.name}
            subtitle={s.contact}
            muted={Boolean(s.archived_at)}
            badges={s.archived_at && <Badge variant="secondary">Arquivado</Badge>}
            actions={
              <RowActions
                onEdit={() => setEditing(s)}
                onToggleArchive={() => archive.mutate(s)}
                archived={Boolean(s.archived_at)}
                onDelete={() => setDeleting(s)}
              />
            }
          />
        ))}
      </SettingsCard>

      <SimpleFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={current ? 'Editar fornecedor' : 'Novo fornecedor'}
        fields={[
          { name: 'name', label: 'Nome', type: 'text', required: true },
          { name: 'contact', label: 'Contato', type: 'text', hint: 'Telefone, loja, link…' },
          { name: 'notes', label: 'Observações', type: 'textarea' },
        ]}
        defaultValues={{
          name: current?.name ?? '',
          contact: current?.contact ?? '',
          notes: current?.notes ?? '',
        }}
        pending={save.isPending}
        onSubmit={(v) =>
          save.mutate({
            id: current?.id,
            name: String(v.name),
            contact: String(v.contact) || null,
            notes: String(v.notes) || null,
          })
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="Compras já registradas com este fornecedor ficarão sem fornecedor. Para manter o histórico, arquive-o."
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
