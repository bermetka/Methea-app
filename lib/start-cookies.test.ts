import { describe, it, expect } from 'vitest'
import { startCookies } from './start-cookies'

const opts = { random: () => 0.9, newId: () => 'new-anon-id-0001', allowVariantParam: true }
const q = (s: string) => new URLSearchParams(s)

describe('startCookies (sales page → Prompt 3 cookie contract)', () => {
  it('first visit: new anon id, angle + utm from the URL, variant from ?p=', () => {
    expect(startCookies(q('a=lens&p=A&utm_source=reddit&utm_campaign=c1&junk=x'), {}, opts)).toEqual({
      anonId: 'new-anon-id-0001',
      attribution: { angle: 'lens', utm_source: 'reddit', utm_campaign: 'c1' },
      variant: 'A',
    })
  })

  it('defaults: angle question, variant 50/50 when no ?p=', () => {
    expect(startCookies(q(''), {}, opts)).toMatchObject({ attribution: { angle: 'question' }, variant: 'B' })
    expect(startCookies(q(''), {}, { ...opts, random: () => 0.1 }).variant).toBe('A')
    expect(startCookies(q('a=bogus'), {}, opts).attribution.angle).toBe('question')
  })

  it('return visit without params keeps the existing id, source and variant', () => {
    const existing = { anonId: 'kept-anon-id-0001', attribution: '{"angle":"deadline","utm_source":"reddit"}', variant: 'A' }
    expect(startCookies(q(''), existing, opts)).toEqual({
      anonId: 'kept-anon-id-0001',
      attribution: { angle: 'deadline', utm_source: 'reddit' },
      variant: 'A',
    })
  })

  it('a new campaign URL replaces the source; ?p= overrides the stored variant', () => {
    const existing = { anonId: 'kept-anon-id-0001', attribution: '{"angle":"deadline","utm_source":"reddit"}', variant: 'A' }
    expect(startCookies(q('a=question&utm_source=google&p=B'), existing, opts)).toMatchObject({
      attribution: { angle: 'question', utm_source: 'google' },
      variant: 'B',
    })
  })

  it('production ignores ?p=: keeps the stored variant, else 50/50', () => {
    const prod = { ...opts, allowVariantParam: false }
    expect(startCookies(q('p=A'), {}, prod).variant).toBe('B')
    expect(startCookies(q('p=B'), { variant: 'A' }, prod).variant).toBe('A')
  })
})
