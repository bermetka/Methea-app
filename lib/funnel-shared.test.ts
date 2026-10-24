import { describe, it, expect } from 'vitest'
import { sanitizeAnonId, sanitizeAttribution } from './funnel-shared'

describe('funnel cookies are sanitised (client-controlled)', () => {
  it('anon id: plain token, 8-64 chars', () => {
    expect(sanitizeAnonId('a1b2c3d4-e5f6')).toBe('a1b2c3d4-e5f6')
    expect(sanitizeAnonId('short')).toBeNull()
    expect(sanitizeAnonId('x'.repeat(65))).toBeNull()
    expect(sanitizeAnonId('<script>alert(1)</script>')).toBeNull()
    expect(sanitizeAnonId(undefined)).toBeNull()
  })

  it('attribution: only known keys with short string values', () => {
    expect(sanitizeAttribution(JSON.stringify({ angle: 'deadline', utm_source: 'tiktok', evil: 'x', utm_term: 5 })))
      .toEqual({ angle: 'deadline', utm_source: 'tiktok' })
    expect(sanitizeAttribution({ angle: 'y'.repeat(101) })).toEqual({})
    expect(sanitizeAttribution('not json')).toEqual({})
    expect(sanitizeAttribution(undefined)).toEqual({})
  })
})
