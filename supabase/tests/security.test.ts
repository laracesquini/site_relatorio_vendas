import { describe, expect, it } from 'vitest'
import { createTestDb, createUser, signIn } from './db'
import { channelId, createProduct, sell } from './fixtures'

describe('access control', () => {
  it('gives the first user access and blocks later sign-ups', async () => {
    const t = await createTestDb()
    const ml = await channelId(t, 'Mercado Livre')
    const { variantId } = await createProduct(t, 'A', { sku: 'A' })

    const stranger = await createUser(t.db, 'intruso@exemplo.com')
    await signIn(t.db, stranger)
    await expect(
      sell(t, ml, 10, [{ variant_id: variantId, quantity: 1, gross_amount: 10 }]),
    ).rejects.toThrow(/Acesso negado/)

    await t.db.exec('set role authenticated')
    expect((await t.db.query('select * from products')).rows).toHaveLength(0)
    await t.db.exec('reset role')
  })

  it('lets members read ledger tables but not write them directly', async () => {
    const t = await createTestDb()
    const ml = await channelId(t, 'Mercado Livre')
    const { variantId } = await createProduct(t, 'A', { sku: 'A' })
    await t.db.exec('set role authenticated')
    await sell(t, ml, 10, [{ variant_id: variantId, quantity: 1, gross_amount: 10 }])
    expect((await t.db.query('select * from sales')).rows).toHaveLength(1)
    expect((await t.db.query('update sales set notes = $1', ['x'])).affectedRows).toBe(0)
    await expect(
      t.db.query(`insert into sales (sale_date, channel_id) values ('2026-09-01', $1)`, [ml]),
    ).rejects.toThrow(/row-level security/)
    await t.db.exec('reset role')
  })

  it('does not expose RPCs to anonymous users', async () => {
    const t = await createTestDb()
    await t.db.exec('set role anon')
    await expect(t.db.query(`select create_sale('{}'::jsonb)`)).rejects.toThrow(/permission denied/)
    await t.db.exec('reset role')
  })
})
