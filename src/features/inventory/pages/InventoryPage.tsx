import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/PageHeader'
import { formatCurrency } from '@/lib/format'
import { useLowStock, useStockValue } from '@/features/dashboard/hooks'
import { FinishedGoodsTab } from '../components/FinishedGoodsTab'
import { MaterialsTab } from '../components/MaterialsTab'
import { MovementsTab } from '../components/MovementsTab'

const TABS = [
  { value: 'insumos', label: 'Insumos', Content: MaterialsTab },
  { value: 'prontos', label: 'Produtos prontos', Content: FinishedGoodsTab },
  { value: 'movimentacoes', label: 'Movimentações', Content: MovementsTab },
]

function Summary() {
  const value = useStockValue()
  const low = useLowStock()
  const lowCount = low.data?.length ?? 0
  return (
    <dl className="mb-4 grid grid-cols-3 gap-2 sm:max-w-2xl">
      {[
        { label: 'Insumos', value: formatCurrency(value.data?.materials) },
        { label: 'Produtos prontos', value: formatCurrency(value.data?.finishedProducts) },
        { label: 'Estoque baixo', value: `${lowCount} ${lowCount === 1 ? 'item' : 'itens'}`, warn: lowCount > 0 },
      ].map((s) => (
        <div key={s.label} className="rounded-lg border bg-card px-3 py-2">
          <dt className="text-xs text-muted-foreground">{s.label}</dt>
          <dd className={s.warn ? 'font-semibold tabular-nums text-warning-foreground dark:text-warning' : 'font-semibold tabular-nums'}>
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function InventoryPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('aba')) ? params.get('aba')! : 'insumos'

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Toda mudança de quantidade é uma movimentação registrada, com data, custo e origem."
      />
      <Summary />
      <Tabs value={tab} onValueChange={(v) => setParams({ aba: v }, { replace: true })}>
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map(({ value, Content }) => (
          <TabsContent key={value} value={value} className="mt-4">
            <Content />
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
