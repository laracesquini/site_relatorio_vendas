// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { CostSheet } from './api'

let sheet: CostSheet | undefined
vi.mock('./api', () => ({ useCostSheet: () => ({ data: sheet }) }))
const { MaterialsPreview } = await import('./MaterialsPreview')
afterEach(cleanup)

const m = (id: string, name: string, unit: string, quantity: number, currentQty: number, variantId: string | null = null) => ({
  id,
  variantId,
  inventoryItemId: id,
  quantity,
  item: { name, unit, avgCost: 0, currentQty },
})

describe('MaterialsPreview', () => {
  it('lists what 2 keychains take from stock: PLA −30 g, Argola −2 un', () => {
    sheet = { materials: [m('pla', 'PLA', 'g', 15, 940), m('argola', 'Argola', 'un', 1, 12)], extras: [] }
    render(<MaterialsPreview productId="p" variantId="v" units={2} title="Insumos que serão baixados" />)
    expect(screen.getByText('PLA').parentElement).toHaveTextContent('−30 g')
    expect(screen.getByText('Argola').parentElement).toHaveTextContent('−2 un')
    expect(screen.queryByText(/insuficiente/)).not.toBeInTheDocument()
  })

  it('uses the variant sheet and warns when stock is short', () => {
    sheet = { materials: [m('pla', 'PLA', 'g', 50, 1000), m('pla-g', 'PLA', 'g', 120, 100, 'grande')], extras: [] }
    render(<MaterialsPreview productId="p" variantId="grande" units={1} title="Insumos" />)
    expect(screen.getByText('PLA').parentElement).toHaveTextContent('−120 g')
    expect(screen.getByText(/Estoque insuficiente de PLA/)).toBeInTheDocument()
  })

  it('says nothing will be deducted when there is no sheet', () => {
    sheet = { materials: [], extras: [] }
    render(<MaterialsPreview productId="p" variantId="v" units={1} title="Insumos" />)
    expect(screen.getByText(/ainda não tem ficha de custo/)).toBeInTheDocument()
  })
})
