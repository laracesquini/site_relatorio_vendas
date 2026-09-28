// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { dashboardKeys, type Overview } from '../api'
import { sampleOverview } from '../testing/sampleOverview'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const { DashboardContent } = await import('./DashboardPage')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})
afterEach(cleanup)

function renderDashboard(data: Overview = sampleOverview, lowStock: unknown[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(dashboardKeys.lowStock(), lowStock)
  client.setQueryData(dashboardKeys.stockValue(), { materials: 350.25, finishedProducts: 120 })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <DashboardContent data={data} isRefreshing={false} />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const kpi = (label: string) =>
  within(screen.getByRole('region', { name: 'Indicadores' })).getByText(label).parentElement!.parentElement!

describe('Dashboard', () => {
  it('shows the headline numbers of the period', () => {
    renderDashboard()
    expect(kpi('Lucro líquido')).toHaveTextContent('R$ 1.233,30')
    expect(kpi('Lucro líquido')).toHaveTextContent('margem 63,72%')
    expect(kpi('Valor recebido')).toHaveTextContent('R$ 1.935,60')
    expect(kpi('Faturamento bruto')).toHaveTextContent('R$ 2.480,00')
    expect(kpi('Resultado do período')).toHaveTextContent('R$ 1.113,30')
    expect(kpi('Compras e despesas')).toHaveTextContent('R$ 540,50')
    expect(kpi('Ticket médio')).toHaveTextContent('R$ 40,00')
    expect(kpi('Vendas')).toHaveTextContent('62')
    expect(kpi('Unidades vendidas')).toHaveTextContent('97')
  })

  it('ranks channels and products', () => {
    renderDashboard()
    const channels = within(screen.getByRole('list', { name: 'Vendas por canal' })).getAllByRole('listitem')
    expect(channels[0]).toHaveTextContent('Mercado Livre')
    expect(channels[0]).toHaveTextContent('R$ 780,40')
    const best = within(screen.getByRole('list', { name: 'Produtos mais vendidos' })).getAllByRole('listitem')
    expect(best[0]).toHaveTextContent('Chaveiro Personalizado38 un')
  })

  it('offers a table view of the time series', async () => {
    const user = renderDashboard()
    const [first] = screen.getAllByRole('button', { name: 'Ver tabela' })
    await user.click(first)
    const table = screen.getByRole('table')
    expect(within(table).getByText('01/09/2026')).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(31)
  })

  it('lists items to restock', () => {
    renderDashboard(sampleOverview, [
      { kind: 'material', id: 'r', name: 'Argolas', detail: null, unit: 'un', current_qty: 12, min_qty: 20, shortfall: 8 },
    ])
    expect(screen.getByText('1 item baixo')).toBeInTheDocument()
    expect(screen.getByText('faltam 8 un')).toBeInTheDocument()
  })

  it('says so when the period has no sales', () => {
    renderDashboard({
      ...sampleOverview,
      summary: { ...sampleOverview.summary, sales_count: 0 },
      series: sampleOverview.series.map((p) => ({ ...p, gross: 0, received: 0, cost: 0, profit: 0 })),
      by_channel: [],
    })
    expect(screen.getByText(/Nenhuma venda neste período/)).toBeInTheDocument()
  })
})
