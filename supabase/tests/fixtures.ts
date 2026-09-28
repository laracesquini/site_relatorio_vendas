import type { TestDb } from './db'

export async function unitId(t: TestDb, code: string) {
  return t.id('select id from units where code = $1', [code])
}

export async function channelId(t: TestDb, name: string) {
  return t.id('select id from sales_channels where name = $1', [name])
}

export async function createMaterial(t: TestDb, name: string, unit = 'g', minQty = 0) {
  return t.id(
    'insert into inventory_items (name, unit_id, min_qty) values ($1, $2, $3) returning id',
    [name, await unitId(t, unit), minQty],
  )
}

export async function buy(t: TestDb, itemId: string, quantity: number, total: number, perUnit = 1) {
  const payload = {
    purchase_date: '2026-09-01',
    items: [
      {
        inventory_item_id: itemId,
        quantity,
        total_amount: total,
        add_to_stock: true,
        stock_qty_per_unit: perUnit,
      },
    ],
  }
  return (await t.one<{ id: string }>('select register_purchase($1) as id', [JSON.stringify(payload)])).id
}

type ProductOptions = {
  sku: string
  price?: number
  estimatedCost?: number
  stockMode?: 'made_to_order' | 'stocked'
  autoDeduct?: boolean
}

/** Product with its default variant; returns both ids. */
export async function createProduct(t: TestDb, name: string, o: ProductOptions) {
  const productId = await t.id(
    `insert into products (name, sku, default_price, estimated_cost, stock_mode, auto_deduct_materials)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [name, o.sku, o.price ?? 0, o.estimatedCost ?? 0, o.stockMode ?? 'made_to_order', o.autoDeduct ?? false],
  )
  const variantId = await t.id(
    'insert into product_variants (product_id, sku, is_default) values ($1, $2, true) returning id',
    [productId, o.sku],
  )
  return { productId, variantId }
}

export type SaleItemInput = {
  variant_id: string
  quantity: number
  gross_amount: number
  unit_cost?: number
}

export async function sell(
  t: TestDb,
  channel: string,
  received: number,
  items: SaleItemInput[],
  date = '2026-09-10',
) {
  const payload = { sale_date: date, channel_id: channel, received_amount: received, items }
  return (await t.one<{ id: string }>('select create_sale($1) as id', [JSON.stringify(payload)])).id
}
