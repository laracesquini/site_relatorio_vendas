import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAppMutation } from '@/lib/api'
import { deleteUnit, saveUnit, settingsKeys, type Unit } from '../api'
import { useUnits } from '../hooks'
import { RowActions } from '@/components/RowActions'
import { SettingsCard, SettingsRow } from './SettingsCard'
import { SimpleFormDialog } from './SimpleFormDialog'

export function UnitsSection() {
  const units = useUnits()
  const [editing, setEditing] = useState<Unit | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Unit | null>(null)
  const invalidate = [settingsKeys.units]

  const save = useAppMutation({
    mutationFn: saveUnit,
    invalidate,
    successMessage: 'Unidade salva',
    onSuccess: () => setEditing(null),
  })
  const remove = useAppMutation({
    mutationFn: (u: Unit) => deleteUnit(u.id),
    invalidate,
    successMessage: 'Unidade excluída',
    onSuccess: () => setDeleting(null),
  })

  const current = editing === 'new' ? null : editing

  return (
    <>
      <SettingsCard
        title="Unidades de medida"
        description="Usadas no estoque de insumos (g, kg, un, m…)."
        addLabel="Nova unidade"
        onAdd={() => setEditing('new')}
        isLoading={units.isLoading}
        error={units.error}
        onRetry={units.refetch}
        isEmpty={units.data?.length === 0}
      >
        {units.data?.map((u) => (
          <SettingsRow
            key={u.id}
            title={u.name}
            subtitle={u.code}
            actions={<RowActions onEdit={() => setEditing(u)} onDelete={() => setDeleting(u)} />}
          />
        ))}
      </SettingsCard>

      <SimpleFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={current ? 'Editar unidade' : 'Nova unidade'}
        fields={[
          { name: 'name', label: 'Nome', type: 'text', required: true, hint: 'Ex.: Grama' },
          { name: 'code', label: 'Sigla', type: 'text', required: true, hint: 'Ex.: g', maxLength: 10 },
        ]}
        defaultValues={{ name: current?.name ?? '', code: current?.code ?? '' }}
        pending={save.isPending}
        onSubmit={(v) => save.mutate({ id: current?.id, name: String(v.name), code: String(v.code) })}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="Só é possível excluir unidades que nenhum insumo usa."
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
