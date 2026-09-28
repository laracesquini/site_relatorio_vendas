// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ProductView, VariantView } from '@/features/products/model'
import type { Channel } from '@/features/settings/api'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const createSale = vi.fn()
vi.mock('../api', () => ({
  createSale: (p: unknown) => createSale(p),
  salesKeys: { all: ['sales'] },
}))

const { NewSaleForm } = await import('./NewSaleForm')

beforeAll(() => {
  // APIs used by Radix/cmdk that happy-dom does not implement.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  createSale.mockReset().mockResolvedValue('sale-id')
})
afterEach(cleanup)

const variant = (over: Partial<VariantView> = {}): VariantView => ({
  id: 'v1',
  sku: 'LUM-LUA',
  label: 'Padrão',
  valueIds: [],
  ownPrice: null,
  price: 30,
  costOverride: null,
  unitCost: 10.9,
  costSource: 'estimate',
  currentQty: 0,
  minStock: 0,
  isDefault: true,
  isActive: true,
  isLowStock: false,
  ...over,
})

const product = (over: Partial<ProductView> = {}): ProductView =>
  ({
    id: 'p1',
    name: 'Luminária Lua',
    sku: 'LUM-LUA',
    is_customizable: false,
    stockMode: 'made_to_order',
    hasVariations: false,
    variants: [variant()],
    priceRange: [30, 30],
    ...over,
  }) as ProductView

const channels = [
  { id: 'ml', name: 'Mercado Livre', is_active: true },
  { id: 'pessoal', name: 'Pessoal', is_active: true },
] as Channel[]

function renderForm(products: ProductView[] = [product()], onDone = vi.fn()) {
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <NewSaleForm
        products={products}
        recentProductIds={[]}
        channels={channels}
        initialChannelId="ml"
        onDone={onDone}
      />
    </QueryClientProvider>,
  )
  return { onDone, user: userEvent.setup() }
}

const summary = () => within(document.querySelector('dl')!)

async function pickProduct(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('combobox', { name: 'Produto' }))
  await user.click(await screen.findByText(name))
}

describe('NewSaleForm', () => {
  it('loads price and cost from the product and shows the live summary', async () => {
    const { user } = renderForm()
    await pickProduct(user, 'Luminária Lua')

    expect(screen.getByLabelText('Preço bruto')).toHaveValue('30,00')
    expect(screen.getByLabelText('Custo unitário de produção')).toHaveValue('10,90')

    await user.type(screen.getByLabelText('Valor recebido'), '19,40')

    const s = summary()
    expect(s.getByText('Taxas').nextSibling).toHaveTextContent('R$ 10,60')
    expect(s.getByText('Lucro').nextSibling).toHaveTextContent('R$ 8,50')
    expect(s.getByText('Margem').nextSibling).toHaveTextContent('43,81%')
  })

  it('recalculates gross and cost when the quantity changes', async () => {
    const { user } = renderForm()
    await pickProduct(user, 'Luminária Lua')
    const qty = screen.getByLabelText('Quantidade')
    await user.clear(qty)
    await user.type(qty, '2')

    expect(screen.getByLabelText('Preço bruto')).toHaveValue('60,00')
    expect(summary().getByText('Custo').nextSibling).toHaveTextContent('R$ 21,80')
  })

  it('keeps a gross price typed by hand when the quantity changes', async () => {
    const { user } = renderForm()
    await pickProduct(user, 'Luminária Lua')
    const gross = screen.getByLabelText('Preço bruto')
    await user.clear(gross)
    await user.type(gross, '50')
    const qty = screen.getByLabelText('Quantidade')
    await user.clear(qty)
    await user.type(qty, '2')
    await user.tab()
    expect(gross).toHaveValue('50,00')
  })

  it('saves the sale with the values on screen', async () => {
    const { user, onDone } = renderForm()
    await pickProduct(user, 'Luminária Lua')
    await user.type(screen.getByLabelText('Valor recebido'), '19,40')
    await user.click(screen.getByRole('button', { name: 'Salvar venda' }))

    await waitFor(() => expect(createSale).toHaveBeenCalledTimes(1))
    expect(createSale.mock.calls[0][0]).toMatchObject({
      channel_id: 'ml',
      received_amount: 19.4,
      items: [{ variant_id: 'v1', quantity: 1, gross_amount: 30, unit_cost: 10.9, is_customized: false }],
    })
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('blocks saving when received is greater than gross', async () => {
    const { user } = renderForm()
    await pickProduct(user, 'Luminária Lua')
    await user.type(screen.getByLabelText('Valor recebido'), '35')
    await user.click(screen.getByRole('button', { name: 'Salvar venda' }))

    expect(await screen.findByText(/não pode ser maior que o preço bruto/)).toBeInTheDocument()
    expect(createSale).not.toHaveBeenCalled()
  })

  it('asks for a product before saving', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Salvar venda' }))
    expect(await screen.findByText('Selecione o produto')).toBeInTheDocument()
    expect(createSale).not.toHaveBeenCalled()
  })

  it('"Salvar e registrar outra" clears the product but keeps channel and date', async () => {
    const { user, onDone } = renderForm()
    await pickProduct(user, 'Luminária Lua')
    const date = screen.getByLabelText('Data')
    await user.clear(date)
    await user.type(date, '2026-09-20')
    await user.type(screen.getByLabelText('Valor recebido'), '19,40')
    await user.click(screen.getByRole('button', { name: 'Salvar e registrar outra' }))

    await waitFor(() => expect(createSale).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Produto' })).toBeInTheDocument())
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Data')).toHaveValue('2026-09-20')
    expect(screen.getByLabelText('Valor recebido')).toHaveValue('')
  })

  it('turns on "Personalizado" for customizable products and sends the notes', async () => {
    const { user } = renderForm([product({ name: 'Chaveiro Nome', is_customizable: true })])
    await pickProduct(user, 'Chaveiro Nome')
    await user.type(screen.getByLabelText('Personalização'), 'Lara')
    await user.type(screen.getByLabelText('Valor recebido'), '19,40')
    await user.click(screen.getByRole('button', { name: 'Salvar venda' }))

    await waitFor(() => expect(createSale).toHaveBeenCalled())
    expect(createSale.mock.calls[0][0].items[0]).toMatchObject({
      is_customized: true,
      customization_notes: 'Lara',
    })
  })

  it('warns when a stocked variant does not have enough units', async () => {
    const { user } = renderForm([
      product({ name: 'Fidget Estrela', stockMode: 'stocked', variants: [variant({ currentQty: 0 })] }),
    ])
    await pickProduct(user, 'Fidget Estrela')
    expect(screen.getByText(/estoque ficará negativo/)).toBeInTheDocument()
  })
})
