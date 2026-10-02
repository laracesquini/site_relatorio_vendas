import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/PageHeader'
import { CategoriesSection } from '../components/CategoriesSection'
import { ChannelsSection } from '../components/ChannelsSection'
import { SuppliersSection } from '../components/SuppliersSection'
import { UnitsSection } from '../components/UnitsSection'
import { VariationsSection } from '../components/VariationsSection'

const TABS = [
  { value: 'canais', label: 'Canais', Section: ChannelsSection },
  { value: 'categorias', label: 'Categorias', Section: CategoriesSection },
  { value: 'variacoes', label: 'Variações', Section: VariationsSection },
  { value: 'unidades', label: 'Unidades', Section: UnitsSection },
  { value: 'fornecedores', label: 'Fornecedores', Section: SuppliersSection },
]

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('aba')) ? params.get('aba')! : 'canais'

  return (
    <>
      <PageHeader title="Configurações" description="Cadastros usados em todo o sistema." />
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
        {TABS.map(({ value, Section }) => (
          <TabsContent key={value} value={value} className="mt-4 max-w-3xl">
            <Section />
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
