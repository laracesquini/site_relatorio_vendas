// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { SaleLine } from '../api'

const lines = [
  {
    id: 'a',
    sale_id: 's1',
    sale_date: '2026-09-10',
    created_at: '2026-09-10T12:00:00Z',
    product_name: 'Plaquinha Pet',
    sku: 'PET-AZ-P',
    variant_attributes: { Cor: 'Azul', Tamanho: 'Pequeno' },
    channel_name: 'Shopee',
    quantity: 1,
    gross_amount: 30,
    received_amount: 19.4,
    fees: 10.6,
    total_cost: 10.9,
    profit: 8.5,
    margin: 43.81,
    is_customized: true,
    customization_notes: 'Nome: Mel',
  },
  {
    id: 'b',
    sale_id: 's2',
    sale_date: '2026-09-12',
    created_at: '2026-09-12T12:00:00Z',
    product_name: 'Luminária Lua',
    sku: 'LUM-LUA',
    variant_attributes: {},
    channel_name: 'Pessoal',
    quantity: 2,
    gross_amount: 100,
    received_amount: 100,
    fees: 0,
    total_cost: 40,
    profit: 60,
    margin: 60,
    is_customized: false,
    customization_notes: null,
  },
] as unknown as SaleLine[]

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('../hooks', () => ({
  useSaleLines: () => ({ data: lines, isLoading: false, isFetching: false, error: null }),
}))
vi.mock('@/features/settings/hooks', () => ({
  useChannels: () => ({ data: [] }),
  useCategoryOptions: () => ({ data: [] }),
}))
vi.mock('@/features/products/hooks', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('../sale-sheet-context', () => ({
  useSaleSheet: () => ({ openNewSale: vi.fn(), openEditSale: vi.fn() }),
}))

const { default: SalesPage } = await import('./SalesPage')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})
afterEach(cleanup)

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SalesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const totals = () => within(screen.getByLabelText('Totais das vendas filtradas'))
const stat = (label: string) => totals().getByText(label).nextSibling

describe('SalesPage', () => {
  it('shows totals of all listed sales', () => {
    renderPage()
    expect(stat('Bruto')).toHaveTextContent('R$ 130,00')
    expect(stat('Recebido')).toHaveTextContent('R$ 119,40')
    expect(stat('Custos')).toHaveTextContent('R$ 50,90')
    expect(stat('Lucro')).toHaveTextContent('R$ 68,50')
    // 68,50 / 119,40
    expect(stat('Margem')).toHaveTextContent('57,37%')
    expect(stat('Unidades')).toHaveTextContent('3 em 2 vendas')
  })

  it('shows Cor and Tamanho as their own columns', () => {
    renderPage()
    expect(screen.getByRole('columnheader', { name: 'Cor' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tamanho' })).toBeInTheDocument()
    const row = screen.getByText('Plaquinha Pet').closest('tr')!
    expect(within(row).getByText('Azul')).toBeInTheDocument()
    expect(within(row).getByText('Pequeno')).toBeInTheDocument()
  })

  it('lists newest sales first', () => {
    renderPage()
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Luminária Lua')
    expect(rows[1]).toHaveTextContent('Plaquinha Pet')
  })

  it('sorts by a column when its header is clicked', async () => {
    const user = renderPage()
    await user.click(screen.getByRole('button', { name: /Lucro líquido/ }))
    let rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Luminária Lua') // highest profit first
    await user.click(screen.getByRole('button', { name: /Lucro líquido/ }))
    rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Plaquinha Pet')
  })
})
