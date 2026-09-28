import { useState } from 'react'
import { X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAppMutation } from '@/lib/api'
import {
  deleteVariationType,
  deleteVariationValue,
  saveVariationType,
  settingsKeys,
  type VariationType,
  type VariationValue,
} from '../api'
import { useVariationTypes } from '../hooks'
import { RowActions } from '@/components/RowActions'
import { AddVariationValue } from './AddVariationValue'
import { SettingsCard } from './SettingsCard'
import { SimpleFormDialog } from './SimpleFormDialog'

export function VariationsSection() {
  const types = useVariationTypes()
  const [editing, setEditing] = useState<VariationType | 'new' | null>(null)
  const [deletingType, setDeletingType] = useState<VariationType | null>(null)
  const [deletingValue, setDeletingValue] = useState<VariationValue | null>(null)
  const invalidate = [settingsKeys.variations]

  const saveType = useAppMutation({
    mutationFn: saveVariationType,
    invalidate,
    successMessage: 'Tipo de variação salvo',
    onSuccess: () => setEditing(null),
  })
  const removeType = useAppMutation({
    mutationFn: (t: VariationType) => deleteVariationType(t.id),
    invalidate,
    successMessage: 'Tipo de variação excluído',
    onSuccess: () => setDeletingType(null),
  })
  const removeValue = useAppMutation({
    mutationFn: (v: VariationValue) => deleteVariationValue(v.id),
    invalidate,
    successMessage: 'Valor excluído',
    onSuccess: () => setDeletingValue(null),
  })

  const current = editing === 'new' ? null : editing

  return (
    <>
      <SettingsCard
        title="Variações"
        description="Tipos (Cor, Tamanho, Modelo…) e seus valores, usados para montar as variações dos produtos."
        addLabel="Novo tipo"
        onAdd={() => setEditing('new')}
        isLoading={types.isLoading}
        error={types.error}
        onRetry={types.refetch}
        isEmpty={types.data?.length === 0}
      >
        {types.data?.map((t) => (
          <li key={t.id} className="space-y-2 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{t.name}</span>
              <RowActions onEdit={() => setEditing(t)} onDelete={() => setDeletingType(t)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {t.values.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1 rounded-full border bg-secondary py-0.5 pl-3 pr-1 text-sm"
                >
                  {v.value}
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={`Excluir ${v.value}`}
                    onClick={() => setDeletingValue(v)}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <AddVariationValue typeId={t.id} typeName={t.name} />
            </div>
          </li>
        ))}
      </SettingsCard>

      <SimpleFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={current ? 'Editar tipo de variação' : 'Novo tipo de variação'}
        fields={[{ name: 'name', label: 'Nome', type: 'text', required: true, hint: 'Ex.: Cor, Tamanho, Modelo' }]}
        defaultValues={{ name: current?.name ?? '' }}
        pending={saveType.isPending}
        onSubmit={(v) => saveType.mutate({ id: current?.id, name: String(v.name) })}
      />

      <ConfirmDialog
        open={deletingType !== null}
        onOpenChange={(open) => !open && setDeletingType(null)}
        title={`Excluir "${deletingType?.name}"?`}
        description="Só é possível excluir tipos sem valores cadastrados."
        confirmLabel="Excluir"
        destructive
        pending={removeType.isPending}
        onConfirm={() => deletingType && removeType.mutate(deletingType)}
      />

      <ConfirmDialog
        open={deletingValue !== null}
        onOpenChange={(open) => !open && setDeletingValue(null)}
        title={`Excluir "${deletingValue?.value}"?`}
        description="Só é possível excluir valores que nenhuma variação de produto usa."
        confirmLabel="Excluir"
        destructive
        pending={removeValue.isPending}
        onConfirm={() => deletingValue && removeValue.mutate(deletingValue)}
      />
    </>
  )
}
