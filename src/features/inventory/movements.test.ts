import { describe, expect, it } from 'vitest'
import { balanceAfterOut, describeOrigin, isLowStock, movementTimestamp, stockValue } from './movements'

const base = {
  reason: 'manual',
  notes: null,
  movement_type: 'IN',
  reverses_movement_id: null,
  sale_id: null,
  sale_product_name: null,
  purchase_id: null,
  purchase_description: null,
  production_id: null,
}

describe('describeOrigin', () => {
  it('names sales, purchases and their reversals', () => {
    expect(describeOrigin({ ...base, movement_type: 'OUT', sale_id: 's', sale_product_name: 'Chaveiro' })).toBe(
      'Venda · Chaveiro',
    )
    expect(
      describeOrigin({ ...base, sale_id: 's', sale_product_name: 'Chaveiro', reverses_movement_id: 'm' }),
    ).toBe('Estorno de venda · Chaveiro')
    expect(describeOrigin({ ...base, purchase_id: 'p', purchase_description: 'PLA' })).toBe('Compra · PLA')
  })

  it('distinguishes production output from material consumption', () => {
    expect(describeOrigin({ ...base, production_id: 'x', movement_type: 'IN' })).toBe('Produção')
    expect(describeOrigin({ ...base, production_id: 'x', movement_type: 'OUT' })).toBe('Consumo na produção')
  })

  it('names manual movements', () => {
    expect(describeOrigin({ ...base, movement_type: 'OUT', reason: 'loss' })).toBe('Perda')
    expect(describeOrigin({ ...base, movement_type: 'ADJUSTMENT' })).toBe('Ajuste de inventário')
    expect(describeOrigin(base)).toBe('Entrada manual')
    expect(describeOrigin({ ...base, movement_type: 'OUT' })).toBe('Saída manual')
  })
})

describe('stock helpers', () => {
  it('values stock at average cost, ignoring negative balances', () => {
    expect(stockValue(940, 0.1139)).toBe(107.07)
    expect(stockValue(-5, 2)).toBe(0)
  })

  it('flags low stock only when a minimum is set', () => {
    expect(isLowStock(12, 20)).toBe(true)
    expect(isLowStock(20, 20)).toBe(false)
    expect(isLowStock(0, 0)).toBe(false)
  })

  it('computes the balance after an OUT without float drift', () => {
    expect(balanceAfterOut(0.3, 0.1)).toBe(0.2)
    expect(balanceAfterOut(2, 3)).toBe(-1)
  })

  it('dates past movements at noon in Brazil and leaves today to the database', () => {
    expect(movementTimestamp('2026-09-28', '2026-09-28')).toBeUndefined()
    expect(movementTimestamp('2026-09-20', '2026-09-28')).toBe('2026-09-20T12:00:00-03:00')
  })
})
