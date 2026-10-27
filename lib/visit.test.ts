import { describe, it, expect } from 'vitest'
import { decodeVisit, encodeVisit, mergeVisit, readVisit, type Visit } from './visit'

const secret = 'test-secret'
const now = 1_800_000_000_000
const visit: Visit = {
  anonId: 'anon-0001-abcd',
  attribution: { angle: 'lens', utm_source: 'reddit', utm_campaign: 'c1' },
  variant: 'A',
  discountCode: 'FOUNDING50',
}

describe('visit carry (sign-in link opened on another device)', () => {
  it('round-trips a signed visit', () => {
    const token = encodeVisit(visit, { now, secret })!
    expect(token).toMatch(/^[\w-]+\.[\w-]+$/)
    expect(decodeVisit(token, { now: now + 1000, secret })).toEqual(visit)
  })

  it('rejects a tampered payload (e.g. switching to the cheaper variant)', () => {
    const token = encodeVisit({ ...visit, variant: 'B' }, { now, secret })!
    const [, sig] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ ...visit, variant: 'A', iat: now })).toString('base64url')
    expect(decodeVisit(`${forged}.${sig}`, { now, secret })).toBeNull()
    expect(decodeVisit(token, { now, secret: 'other-secret' })).toBeNull()
  })

  it('rejects expired, garbage and missing tokens', () => {
    const token = encodeVisit(visit, { now, secret })!
    expect(decodeVisit(token, { now: now + 8 * 24 * 3600 * 1000, secret })).toBeNull()
    expect(decodeVisit('not-a-token', { now, secret })).toBeNull()
    expect(decodeVisit(null, { now, secret })).toBeNull()
  })

  it('carries nothing for a visitor with no sales-page cookies, or without a secret', () => {
    expect(encodeVisit({ attribution: {} }, { now, secret })).toBeNull()
    expect(encodeVisit(visit, { now, secret: '' })).toBeNull()
  })

  it('reads the cookie contract', () => {
    const jar = new Map([
      ['methea_anon_id', 'anon-0001-abcd'],
      ['methea_attribution', '{"angle":"lens","utm_source":"reddit","utm_campaign":"c1"}'],
      ['methea_price_variant', 'A'],
      ['methea_discount_code', 'FOUNDING50'],
    ])
    expect(readVisit({ get: n => (jar.has(n) ? { value: jar.get(n)! } : undefined) })).toEqual(visit)
  })
})

describe('mergeVisit', () => {
  it("same device: this device's cookies win, nothing restored", () => {
    const own: Visit = { anonId: 'own-anon-0001', attribution: { angle: 'deadline' }, variant: 'B' }
    const { visit: v, restored, variantSource } = mergeVisit(own, visit)
    expect(v).toEqual({ ...own, discountCode: 'FOUNDING50' })
    expect(restored).toEqual({ anonId: false, attribution: false, variant: false, discountCode: true })
    expect(variantSource).toBe('cookie')
  })

  it('new device: everything comes from the link', () => {
    const { visit: v, restored, variantSource } = mergeVisit({ attribution: {} }, visit)
    expect(v).toEqual(visit)
    expect(restored).toEqual({ anonId: true, attribution: true, variant: true, discountCode: true })
    expect(variantSource).toBe('link')
  })

  it('no cookies and no link: random variant', () => {
    expect(mergeVisit({ attribution: {} }, null).variantSource).toBe('random')
  })
})
