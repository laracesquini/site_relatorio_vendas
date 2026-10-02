// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { InventoryItem } from '@/features/inventory/api'
import type { Category } from '@/features/settings/api'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const registerPurchase = vi.fn()
const updatePurchase = vi.fn()
vi.mock('../api', () => ({
  registerPurchase: (p: unknown) => registerPurchase(p),
  updatePurchase: (id: string, p: unknown) => updatePurchase(id, p),
  purchaseKeys: { all: ['purchases'] },
}))
vi.mock('@/features/inventory/components/ItemFormDialog', () => ({ ItemFormDialog: () => null }))

const { PurchaseForm } = await import('./PurchaseForm')
const { emptyPurchaseForm } = await import('../schema')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})
beforeEach(() => {
  registerPurchase.mockReset().mockResolvedValue('id')
  updatePurchase.mockReset().mockResolvedValue('id')
})
afterEach(cleanup)

const pla = {
  id: 'pla',
  name: 'PLA Preto',
  category_id: 'filamentos',
  unit: { code: 'g', name: 'Grama' },
  current_qty: 1000,
  avg_cost: 0.1,
  archived_at: null,
} as unknown as InventoryItem

const categories = [
  { id: 'filamentos', name: 'Filamentos', kind: 'material', is_operational: false },
  { id: 'ads', name: 'Anúncios', kind: 'expense', is_operational: true },
] as Category[]

function renderForm(onDone = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PurchaseForm initial={emptyPurchaseForm()} items={[pla]} categories={categories} suppliers={[]} onDone={onDone} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), onDone }
}

async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('PurchaseForm', () => {
  it('buys a spool into stock, converting to grams and previewing the new average', async () => {
    const { user, onDone } = renderForm()
    await choose(user, 'Insumo do estoque', 'PLA Preto (g)')
    await user.type(screen.getByLabelText('Valor total'), '120')
    expect(screen.getByRole('switch', { name: /Adicionar esta compra ao estoque/ })).toBeChecked()
    await user.type(screen.getByLabelText(/equivale a quantos g/), '1000')

    expect(screen.getByText(/Entram/)).toHaveTextContent('Entram 1.000 g a R$ 0,12/g')
    expect(screen.getByText(/Custo médio/)).toHaveTextContent('R$ 0,10 → R$ 0,11/g')
    expect(screen.getByText('Total da compra').parentElement).toHaveTextContent('R$ 120,00')

    await user.click(screen.getByRole('button', { name: 'Registrar compra' }))
    await waitFor(() => expect(registerPurchase).toHaveBeenCalledTimes(1))
    expect(registerPurchase.mock.calls[0][0].items).toEqual([
      {
        description: null,
        category_id: 'filamentos',
        inventory_item_id: 'pla',
        quantity: 1,
        total_amount: 120,
        add_to_stock: true,
        stock_qty_per_unit: 1000,
      },
    ])
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('registers an expense and a material in the same purchase', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText('Descrição'), 'Anúncio Shopee')
    await choose(user, 'Categoria', 'Anúncios (operacional)')
    await user.type(screen.getByLabelText('Valor total'), '25')
    await user.click(screen.getByRole('button', { name: 'Adicionar item' }))

    const selects = screen.getAllByRole('combobox', { name: 'Insumo do estoque' })
    await user.click(selects[1])
    await user.click(await screen.findByRole('option', { name: 'PLA Preto (g)' }))
    const totals = screen.getAllByLabelText('Valor total')
    await user.type(totals[1], '113,90')
    expect(screen.getByText('Total da compra').parentElement).toHaveTextContent('R$ 138,90')

    await user.click(screen.getByRole('button', { name: 'Registrar compra' }))
    await waitFor(() => expect(registerPurchase).toHaveBeenCalled())
    const [expense, material] = registerPurchase.mock.calls[0][0].items
    expect(expense).toMatchObject({ description: 'Anúncio Shopee', category_id: 'ads', add_to_stock: false, inventory_item_id: null })
    expect(material).toMatchObject({ inventory_item_id: 'pla', add_to_stock: true, stock_qty_per_unit: 1 })
  })

  it('shows the unit price as you type (100 argolas por R$ 34,11)', async () => {
    const { user } = renderForm()
    const qty = screen.getByLabelText('Quantidade')
    await user.clear(qty)
    await user.type(qty, '100')
    await user.type(screen.getByLabelText('Valor total'), '34,11')
    expect(screen.getByText('Preço unitário').nextSibling).toHaveTextContent('R$ 0,3411')
  })

  it('asks for a description or a material, and a total', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Registrar compra' }))
    expect(await screen.findByText('Descreva o item ou escolha um insumo')).toBeInTheDocument()
    expect(screen.getByText('Informe o valor')).toBeInTheDocument()
    expect(registerPurchase).not.toHaveBeenCalled()
  })
})
