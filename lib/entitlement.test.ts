import { describe, it, expect } from 'vitest'
import { isProjectPaid } from './entitlement'

describe('isProjectPaid', () => {
  it('returns false when paid_at is null', () => {
    expect(isProjectPaid({ paid_at: null })).toBe(false)
  })

  it('returns true when paid_at is a timestamp', () => {
    expect(isProjectPaid({ paid_at: '2026-07-27T12:00:00.000Z' })).toBe(true)
  })

  it('returns false when paid_at is undefined (e.g. caller forgot to select the column)', () => {
    expect(isProjectPaid({ paid_at: undefined as unknown as string | null })).toBe(false)
  })
})
