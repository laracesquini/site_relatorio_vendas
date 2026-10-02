// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { StockTarget } from '../api'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const registerMovement = vi.fn()
const adjustStockTo = vi.fn()
const saveInventoryItem = vi.fn()
vi.mock('../api', () => ({
  registerMovement: (x: unknown) => registerMovement(x),
  adjustStockTo: (x: unknown) => adjustStockTo(x),
  saveInventoryItem: (x: unknown) => saveInventoryItem(x),
  inventoryKeys: { all: ['inventory'] },
}))
vi.mock('@/features/settings/hooks', () => ({
  useUnits: () => ({ data: [{ id: 'g', code: 'g', name: 'Grama' }] }),
  useCategoryOptions: () => ({ data: [] }),
  useSuppliers: () => ({ data: [] }),
}))

const { MovementDialog } = await import('./MovementDialog')
const { ItemFormDialog } = await import('./ItemFormDialog')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})
beforeEach(() => {
  registerMovement.mockReset().mockResolvedValue({})
  adjustStockTo.mockReset().mockResolvedValue({})
  saveInventoryItem.mockReset().mockResolvedValue('id')
})
afterEach(cleanup)

const wrap = (ui: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
)

const rings: StockTarget = { kind: 'material', id: 'r1', name: 'Argolas', unit: 'un', currentQty: 12, avgCost: 0.34 }

describe('MovementDialog', () => {
  it('registers an entry with its cost', async () => {
    const onClose = vi.fn()
    render(wrap(<MovementDialog target={rings} mode="IN" onClose={onClose} />))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Quantidade'), '100')
    await user.type(screen.getByLabelText('Custo por un'), '0,35')
    expect(screen.getByText(/Estoque depois/)).toHaveTextContent('112 un')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(registerMovement).toHaveBeenCalledTimes(1))
    expect(registerMovement.mock.calls[0][0]).toMatchObject({
      target: rings,
      type: 'IN',
      quantity: 100,
      unitCost: 0.35,
      reason: 'manual',
      occurredAt: undefined,
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('records a loss and warns before stock goes negative', async () => {
    render(wrap(<MovementDialog target={rings} mode="OUT" onClose={vi.fn()} />))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Quantidade'), '15')
    expect(screen.getByText(/ficará negativo/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Motivo' }))
    await user.click(await screen.findByRole('option', { name: 'Perda ou defeito' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(registerMovement).toHaveBeenCalled())
    expect(registerMovement.mock.calls[0][0]).toMatchObject({ type: 'OUT', quantity: 15, reason: 'loss', unitCost: null })
  })

  it('adjusts to the counted quantity and shows the difference', async () => {
    render(wrap(<MovementDialog target={rings} mode="ADJUST" onClose={vi.fn()} />))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Quantidade contada'), '9')
    expect(screen.getByText(/Estoque depois/)).toHaveTextContent('ajuste de -3 un')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(adjustStockTo).toHaveBeenCalled())
    expect(adjustStockTo.mock.calls[0][0]).toMatchObject({ target: rings, counted: 9 })
  })

  it('requires a positive quantity', async () => {
    render(wrap(<MovementDialog target={rings} mode="OUT" onClose={vi.fn()} />))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByText('Informe uma quantidade maior que zero')).toBeInTheDocument()
    expect(registerMovement).not.toHaveBeenCalled()
  })
})

describe('ItemFormDialog', () => {
  it('creates a material with opening stock and cost', async () => {
    render(wrap(<ItemFormDialog open onOpenChange={vi.fn()} />))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nome'), 'PLA Preto')
    await user.click(screen.getByRole('combobox', { name: 'Unidade' }))
    await user.click(await screen.findByRole('option', { name: 'Grama (g)' }))
    await user.type(screen.getByLabelText('Estoque mínimo'), '200')
    await user.type(screen.getByLabelText('Quantidade atual'), '1000')
    await user.type(screen.getByLabelText('Custo por g'), '0,1139')
    expect(screen.getByText(/Valor em estoque: R\$\s113,90/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(saveInventoryItem).toHaveBeenCalledTimes(1))
    expect(saveInventoryItem.mock.calls[0][0]).toMatchObject({
      name: 'PLA Preto',
      unit_id: 'g',
      min_qty: 200,
      initial_qty: 1000,
      initial_unit_cost: 0.1139,
    })
  })

  it('requires name and unit', async () => {
    render(wrap(<ItemFormDialog open onOpenChange={vi.fn()} />))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Informe o nome')).toBeInTheDocument()
    expect(screen.getByText('Selecione a unidade')).toBeInTheDocument()
    expect(saveInventoryItem).not.toHaveBeenCalled()
  })
})
