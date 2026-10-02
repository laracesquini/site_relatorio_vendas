import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAppMutation } from '@/lib/api'
import {
  deleteCategory,
  saveCategory,
  setCategoryArchived,
  settingsKeys,
  type Category,
  type CategoryKind,
} from '../api'
import { useCategories } from '../hooks'
import { RowActions } from '@/components/RowActions'
import { SettingsCard, SettingsRow } from './SettingsCard'
import { SimpleFormDialog, type SimpleField } from './SimpleFormDialog'

const KIND_LABELS: Record<CategoryKind, string> = {
  product: 'Produtos',
  material: 'Insumos',
  expense: 'Despesas',
}

export function CategoriesSection() {
  const categories = useCategories()
  const [kind, setKind] = useState<CategoryKind>('product')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const invalidate = [settingsKeys.categories]

  const save = useAppMutation({
    mutationFn: saveCategory,
    invalidate,
    successMessage: 'Categoria salva',
    onSuccess: () => setEditing(null),
  })
  const archive = useAppMutation({
    mutationFn: (c: Category) => setCategoryArchived(c.id, !c.archived_at),
    invalidate,
    successMessage: (_, c) => (c.archived_at ? 'Categoria restaurada' : 'Categoria arquivada'),
  })
  const remove = useAppMutation({
    mutationFn: (c: Category) => deleteCategory(c.id),
    invalidate,
    successMessage: 'Categoria excluída',
    onSuccess: () => setDeleting(null),
  })

  const rows = categories.data?.filter((c) => c.kind === kind) ?? []
  const current = editing === 'new' ? null : editing
  const fields: SimpleField[] = [{ name: 'name', label: 'Nome', type: 'text', required: true }]
  if (kind === 'expense') {
    fields.push({
      name: 'is_operational',
      label: 'Despesa operacional',
      type: 'switch',
      hint: 'Descontada no "Resultado do período" (anúncios, impostos, ferramentas…).',
    })
  }

  return (
    <>
      <SettingsCard
        title="Categorias"
        description="Organizam produtos, insumos e despesas nos filtros e relatórios."
        addLabel="Nova categoria"
        onAdd={() => setEditing('new')}
        isLoading={categories.isLoading}
        error={categories.error}
        onRetry={categories.refetch}
        isEmpty={false}
      >
        <li className="pb-3">
          <Tabs value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
            <TabsList>
              {(Object.keys(KIND_LABELS) as CategoryKind[]).map((k) => (
                <TabsTrigger key={k} value={k}>
                  {KIND_LABELS[k]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </li>
        {rows.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma categoria.</li>
        )}
        {rows.map((c) => (
          <SettingsRow
            key={c.id}
            title={c.name}
            muted={Boolean(c.archived_at)}
            badges={
              <>
                {c.kind === 'expense' && c.is_operational && <Badge variant="outline">Operacional</Badge>}
                {c.archived_at && <Badge variant="secondary">Arquivada</Badge>}
              </>
            }
            actions={
              <RowActions
                onEdit={() => setEditing(c)}
                onToggleArchive={() => archive.mutate(c)}
                archived={Boolean(c.archived_at)}
                onDelete={() => setDeleting(c)}
              />
            }
          />
        ))}
      </SettingsCard>

      <SimpleFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={current ? 'Editar categoria' : `Nova categoria de ${KIND_LABELS[kind].toLowerCase()}`}
        fields={fields}
        defaultValues={{
          name: current?.name ?? '',
          is_operational: current?.is_operational ?? kind === 'expense',
        }}
        pending={save.isPending}
        onSubmit={(v) => {
          const k = (current?.kind as CategoryKind | undefined) ?? kind
          save.mutate({
            id: current?.id,
            name: String(v.name),
            kind: k,
            is_operational: k === 'expense' && Boolean(v.is_operational),
          })
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="Só é possível excluir categorias que não estão em uso. Caso contrário, arquive-a."
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
