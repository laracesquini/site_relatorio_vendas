import { Hammer } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

// Placeholder for areas not built yet. Removed as each MVP stage lands.
export default function UpcomingPage({ title, stage }: { title: string; stage: number }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={Hammer}
        title="Em construção"
        description={`Esta área será implementada na etapa ${stage} do plano.`}
      />
    </>
  )
}
