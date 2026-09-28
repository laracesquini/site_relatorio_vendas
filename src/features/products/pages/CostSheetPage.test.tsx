// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { InventoryItem } from '@/features/inventory/api'
import type { ProductView, VariantView } from '../model'
import type { CostSheet } from '../costSheet/api'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const saveCostSheet = vi.fn()
vi.mock('../costSheet/api', () => ({
  saveCostSheet: (id: string, p: unknown) => saveCostSheet(id, p),
  useCostSheet: () => ({}),
}))
const navigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }))

const { CostSheetEditor } = await import('./CostSheetPage')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})
beforeEach(() => {
  saveCostSheet.mockReset().mockResolvedValue(undefined)
  navigate.mockReset()
})
afterEach(cleanup)

const material = (id: string, name: string, unit: string, avg: number) =>
  ({ id, name, unit: { code: unit, name: unit }, avg_cost: avg, current_qty: 1000, archived_at: null }) as unknown as InventoryItem
const items = [material('pla', 'PLA', 'g', 0.1), material('argola', 'Argola', 'un', 0.34), material('emb', 'Embalagem', 'un', 0.2)]

const variant = (over: Partial<VariantView>): VariantView =>
  ({ id: 'v', label: 'Padrão', isDefault: true, isActive: true, price: 10, costOverride: null, ...over }) as VariantView

const product = (variants: VariantView[]) =>
  ({
    id: 'p1',
    name: 'Chaveiro Personalizado',
    stockMode: 'made_to_order',
    auto_deduct_materials: true,
    hasVariations: variants.some((v) => !v.isDefault),
    variants,
  }) as unknown as ProductView

const empty: CostSheet = { materials: [], extras: [] }

function renderEditor(p = product([variant({})]), sheet = empty) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CostSheetEditor product={p} sheet={sheet} items={items} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

async function addMaterial(user: ReturnType<typeof userEvent.setup>, row: number, option: string, qty: string) {
  await user.click(screen.getAllByRole('button', { name: 'Adicionar insumo' })[0])
  await user.click(screen.getByRole('combobox', { name: `Insumo da linha ${row}` }))
  await user.click(await screen.findByRole('option', { name: option }))
  await user.type(screen.getByLabelText(`Quantidade da linha ${row}`), qty)
}

const summaryRow = (label: string) => within(screen.getByRole('table')).getByText(label).closest('tr')!

describe('CostSheetEditor', () => {
  it('builds the keychain sheet and shows R$ 2,04 per piece before saving', async () => {
    const user = renderEditor()
    await addMaterial(user, 1, 'PLA (g)', '15')
    await addMaterial(user, 2, 'Argola (un)', '1')
    await addMaterial(user, 3, 'Embalagem (un)', '1')

    const row = summaryRow('Padrão')
    expect(row).toHaveTextContent('R$ 2,04')
    expect(row).toHaveTextContent('79,60%') // (10 − 2,04) / 10

    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }))
    await waitFor(() => expect(saveCostSheet).toHaveBeenCalledTimes(1))
    expect(saveCostSheet.mock.calls[0]).toEqual([
      'p1',
      {
        materials: [
          { inventory_item_id: 'pla', quantity: 15, variant_id: null },
          { inventory_item_id: 'argola', quantity: 1, variant_id: null },
          { inventory_item_id: 'emb', quantity: 1, variant_id: null },
        ],
        extra_costs: [],
      },
    ])
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/produtos/p1'))
  })

  it('adds extra costs from the suggestions', async () => {
    const user = renderEditor()
    await addMaterial(user, 1, 'PLA (g)', '15')
    await user.click(screen.getByRole('button', { name: 'Energia' }))
    await user.type(screen.getByLabelText('Valor do custo 1'), '0,12')
    expect(summaryRow('Padrão')).toHaveTextContent('R$ 1,62')
  })

  it('gives a variant its own sheet, starting from the product sheet', async () => {
    const user = renderEditor(
      product([
        variant({ id: 'p', label: 'Pequeno', isDefault: false }),
        variant({ id: 'g', label: 'Grande', isDefault: false, price: 20 }),
      ]),
      {
        materials: [{ id: 'm', variantId: null, inventoryItemId: 'pla', quantity: 50, item: { name: 'PLA', unit: 'g', avgCost: 0.1, currentQty: 1000 } }],
        extras: [],
      },
    )
    await user.click(screen.getByRole('switch', { name: /Grande · ficha própria/ }))
    const qty = screen.getAllByLabelText('Quantidade da linha 1')[1]
    expect(qty).toHaveValue('50')
    await user.clear(qty)
    await user.type(qty, '120')

    expect(summaryRow('Pequeno')).toHaveTextContent('R$ 5,00')
    expect(summaryRow('Grande')).toHaveTextContent('R$ 12,00')
    expect(summaryRow('Grande')).toHaveTextContent('Ficha própria')

    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }))
    await waitFor(() => expect(saveCostSheet).toHaveBeenCalled())
    expect(saveCostSheet.mock.calls[0][1].materials).toEqual([
      { inventory_item_id: 'pla', quantity: 50, variant_id: null },
      { inventory_item_id: 'pla', quantity: 120, variant_id: 'g' },
    ])
  })

  it('flags incomplete rows instead of saving', async () => {
    const user = renderEditor()
    await user.click(screen.getByRole('button', { name: 'Adicionar insumo' }))
    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }))
    expect(await screen.findByText('Selecione o insumo')).toBeInTheDocument()
    expect(screen.getByText('Maior que zero')).toBeInTheDocument()
    expect(saveCostSheet).not.toHaveBeenCalled()
  })
})
