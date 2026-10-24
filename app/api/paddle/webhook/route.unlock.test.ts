import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventName } from '@paddle/paddle-node-sdk'

/**
 * Unlock behaviour of the real POST handler, with signature verification mocked
 * to return a crafted event and the service-role client replaced by a fake that
 * records every update. Covers: foreign prices on the shared Paddle account,
 * idempotency, first payment, re-buy after expiry, and no-op inside the window.
 */

let storedProject: { paid_at: string | null; paddle_transaction_id: string | null } | null
let updates: { values: Record<string, unknown>; filters: [string, string, unknown][] }[]
let serviceRoleConstructed: boolean

vi.mock('@/lib/paddle/verify-webhook', () => ({
  verifyPaddleWebhook: vi.fn(async (rawBody: string) => JSON.parse(rawBody)),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => {
    serviceRoleConstructed = true
    return {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: storedProject, error: null }) }) }),
        update: (values: Record<string, unknown>) => {
          const record = { values, filters: [] as [string, string, unknown][] }
          updates.push(record)
          const builder = {
            eq: (col: string, v: unknown) => { record.filters.push(['eq', col, v]); return builder },
            is: (col: string, v: unknown) => { record.filters.push(['is', col, v]); return builder },
            then: (resolve: (r: { error: null }) => void) => resolve({ error: null }),
          }
          return builder
        },
      }),
    }
  },
}))

function event(priceId: string, txId = 'txn_new') {
  return {
    eventType: EventName.TransactionCompleted,
    data: {
      id: txId,
      currencyCode: 'USD',
      discountId: null,
      customData: { project_id: 'proj_1' },
      details: { totals: { grandTotal: '9900' } },
      items: [{ price: { id: priceId } }],
    },
  }
}

async function post(body: object) {
  const { POST } = await import('./route')
  const res = await POST(new Request('http://localhost/api/paddle/webhook', {
    method: 'POST',
    headers: { 'paddle-signature': 'ts=1;h1=mocked' },
    body: JSON.stringify(body),
  }))
  return { status: res.status, body: await res.json() }
}

beforeEach(() => {
  process.env.PADDLE_WEBHOOK_SECRET = 'test'
  process.env.PADDLE_PRICE_ID_A = 'pri_a'
  process.env.PADDLE_PRICE_ID_B = 'pri_b'
  storedProject = { paid_at: null, paddle_transaction_id: null }
  updates = []
  serviceRoleConstructed = false
})

describe('Paddle webhook — unlocking projects', () => {
  it('ignores a transaction for another product on the shared account (200, no DB access)', async () => {
    const res = await post(event('pri_onion'))
    expect(res.status).toBe(200)
    expect(res.body.ignored).toBe('not a Methea price')
    expect(serviceRoleConstructed).toBe(false)
    expect(updates).toHaveLength(0)
  })

  it('unlocks an unpaid project and records the payment fields', async () => {
    const res = await post(event('pri_b'))
    expect(res.status).toBe(200)
    expect(updates).toHaveLength(1)
    expect(updates[0].values).toMatchObject({
      paddle_transaction_id: 'txn_new', amount_paid: 9900, currency: 'USD', paid_price_variant: 'B', discount_code: null,
    })
    expect(updates[0].filters).toContainEqual(['is', 'paid_at', null])
  })

  it('never applies the same transaction twice', async () => {
    storedProject = { paid_at: '2026-11-10T00:00:00.000Z', paddle_transaction_id: 'txn_new' }
    const res = await post(event('pri_a', 'txn_new'))
    expect(res.status).toBe(200)
    expect(updates).toHaveLength(0)
  })

  it('re-buy after the 6-month window starts a new window', async () => {
    storedProject = { paid_at: '2025-01-01T00:00:00.000Z', paddle_transaction_id: 'txn_old' }
    const res = await post(event('pri_a', 'txn_rebuy'))
    expect(res.status).toBe(200)
    expect(updates).toHaveLength(1)
    expect(updates[0].values.paddle_transaction_id).toBe('txn_rebuy')
    expect(Date.parse(updates[0].values.paid_at as string)).toBeGreaterThan(Date.parse('2026-01-01'))
    // Conditional on the old paid_at, so concurrent deliveries can't both apply.
    expect(updates[0].filters).toContainEqual(['eq', 'paid_at', '2025-01-01T00:00:00.000Z'])
  })

  it('does not touch a project that is still inside its paid window', async () => {
    storedProject = { paid_at: new Date().toISOString(), paddle_transaction_id: 'txn_old' }
    const res = await post(event('pri_a', 'txn_other'))
    expect(res.status).toBe(200)
    expect(res.body.warning).toBe('project already paid')
    expect(updates).toHaveLength(0)
  })
})
