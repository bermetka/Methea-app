import { describe, it, expect } from 'vitest'
import { verifyPaddleWebhook } from './verify-webhook'

describe('verifyPaddleWebhook', () => {
  it('returns null for an invalid signature', async () => {
    const result = await verifyPaddleWebhook(
      '{"event_id":"evt_123","event_type":"transaction.completed"}',
      'ts=1;h1=not-a-real-signature',
      'test_secret_key'
    )
    expect(result).toBeNull()
  })

  it('returns null for a malformed signature header (missing ts/h1)', async () => {
    const result = await verifyPaddleWebhook(
      '{"event_id":"evt_123","event_type":"transaction.completed"}',
      'not-a-valid-header-format',
      'test_secret_key'
    )
    expect(result).toBeNull()
  })
})
