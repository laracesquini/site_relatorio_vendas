import { describe, expect, it } from 'vitest'
import { createTestDb } from './db'

describe('migrations', () => {
  it('apply cleanly and create the initial settings', async () => {
    const t = await createTestDb()
    const channels = await t.all<{ name: string }>('select name from sales_channels order by sort_order')
    expect(channels.map((c) => c.name)).toEqual(['Mercado Livre', 'Shopee', 'TikTok Shop', 'Pessoal'])
    const members = await t.all('select * from members')
    expect(members).toHaveLength(1)
  })
})
