import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Proves the two properties the human reviewer asked for on this hard-stop:
 *
 * 1. An invalid Paddle signature is rejected with 401 by the actual exported
 *    `POST` handler — invoked directly with a real `Request` object, no
 *    running server involved (Next.js Route Handlers are plain async
 *    functions, so this is a genuine runnable test, not a hand-trace).
 * 2. `createServiceRoleClient` (the RLS-bypassing client) is never
 *    constructed on the failed-verification path — we mock it to throw if
 *    called at all, and assert it was never called.
 */

const createServiceRoleClientMock = vi.fn(() => {
  throw new Error('createServiceRoleClient should never be called on an invalid-signature path')
})

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}))

beforeEach(() => {
  createServiceRoleClientMock.mockClear()
  process.env.PADDLE_WEBHOOK_SECRET = 'test_secret_key'
})

describe('POST /api/paddle/webhook', () => {
  it('returns 401 and never touches the service-role client for a bad signature', async () => {
    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/paddle/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'paddle-signature': 'ts=1;h1=deliberately-wrong-signature',
      },
      body: JSON.stringify({ event_id: 'evt_123', event_type: 'transaction.completed' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'invalid signature' })
    expect(createServiceRoleClientMock).not.toHaveBeenCalled()
  })

  it('returns 401 and never touches the service-role client when the signature header is missing', async () => {
    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/paddle/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_id: 'evt_123', event_type: 'transaction.completed' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'missing signature' })
    expect(createServiceRoleClientMock).not.toHaveBeenCalled()
  })
})
