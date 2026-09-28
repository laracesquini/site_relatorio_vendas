// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { sampleCashFlow, sampleDetails } from '../testing/sampleReports'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const downloadCsv = vi.fn()
vi.mock('@/lib/csv', async (orig) => ({ ...(await orig<typeof import('@/lib/csv')>()), downloadCsv: (...a: unknown[]) => downloadCsv(...a) }))
vi.mock('../api', async (orig) => ({
  ...(await orig<typeof import('../api')>()),
  useCashFlow: () => ({ data: sampleCashFlow, isLoading: false, isFetching: false, error: null }),
  useOtherIncomes: () => ({ data: [], isLoading: false, error: null }),
}))

const { ResultsTab } = await import('./ResultsTab')
const { ChannelsTab } = await import('./ChannelsTab')
const { CashFlowTab } = await import('./CashFlowTab')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})
afterEach(() => {
  cleanup()
  downloadCsv.mockReset()
})

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
const stat = (strip: string, label: string) =>
  within(screen.getByLabelText(strip)).getByText(label).parentElement!

describe('ResultsTab', () => {
  it('totals the period and computes the weighted margin', () => {
    wrap(<ResultsTab data={sampleDetails} />)
    expect(stat('Resultado do período', 'Lucro líquido')).toHaveTextContent('R$ 45,50')
    // 45,50 / 64,40
    expect(stat('Resultado do período', 'Margem média')).toHaveTextContent('70,65%')
    const footer = screen.getByRole('table').querySelector('tfoot')!
    expect(footer).toHaveTextContent('Total')
    expect(footer).toHaveTextContent('R$ 64,40')
  })

  it('names weeks in the table', () => {
    wrap(<ResultsTab data={sampleDetails} />)
    expect(screen.getByText('semana de 07/09/2026')).toBeInTheDocument()
  })

  it('exports the same rows as CSV', async () => {
    wrap(<ResultsTab data={sampleDetails} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'CSV' }))
    const [filename, csv] = downloadCsv.mock.calls[0] as [string, string]
    expect(filename).toBe('vendas-por-semana_2026-09-01_2026-09-30')
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Período;Vendas;Unidades;Bruto (R$);Taxas (R$);Recebido (R$);Custo (R$);Lucro (R$);Margem (%)')
    expect(lines[1]).toBe('semana de 31/08/2026;1;1;30;10,6;19,4;10,9;8,5;43,81')
    expect(lines).toHaveLength(4)
  })
})

describe('ChannelsTab', () => {
  it('shows the average marketplace fee per channel and overall', () => {
    wrap(<ChannelsTab data={sampleDetails} />)
    const ml = screen.getByText('Mercado Livre').closest('tr')!
    expect(ml).toHaveTextContent('31,20%')
    // (15,60 + 0) / (50 + 30)
    expect(screen.getByRole('table').querySelector('tfoot')).toHaveTextContent('19,50%')
  })
})

describe('CashFlowTab', () => {
  it('shows inflows, outflows and balance next to profit, which is a different number', () => {
    wrap(<CashFlowTab query={{ from: '2026-09-01', to: '2026-09-30', bucket: 'week' }} details={sampleDetails} />)
    const strip = 'Fluxo de caixa do período'
    expect(stat(strip, 'Entradas')).toHaveTextContent('R$ 144,40')
    expect(stat(strip, 'Saídas')).toHaveTextContent('R$ 223,01')
    expect(stat(strip, 'Saldo')).toHaveTextContent('-R$ 78,61')
    expect(stat(strip, 'Lucro das vendas')).toHaveTextContent('R$ 45,50')
    expect(screen.getByText(/Saldo de caixa não é lucro/)).toBeInTheDocument()
  })

  it('keeps a running balance per period', () => {
    wrap(<CashFlowTab query={{ from: '2026-09-01', to: '2026-09-30', bucket: 'week' }} />)
    const last = screen.getByText('semana de 14/09/2026').closest('tr')!
    expect(last).toHaveTextContent('R$ 35,89')
    expect(last).toHaveTextContent('-R$ 78,61')
  })
})
