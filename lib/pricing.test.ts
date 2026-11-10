import { describe, it, expect, beforeEach } from 'vitest'
import {
  parsePriceVariant,
  randomPriceVariant,
  priceForVariant,
  priceSplitEnabled,
  effectiveVariant,
  fromPriceLabel,
  sanitizeDiscountCode,
  foundingBannerText,
  priceLabel,
} from './pricing'

beforeEach(() => {
  process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_A = 'pri_a'
  process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_B = 'pri_b'
  process.env.NEXT_PUBLIC_PRICE_LABEL_A = '$49'
  process.env.NEXT_PUBLIC_PRICE_LABEL_B = '$99'
})

describe('price variants', () => {
  it('parses only A or B', () => {
    expect(parsePriceVariant('A')).toBe('A')
    expect(parsePriceVariant('B')).toBe('B')
    expect(parsePriceVariant('a')).toBeNull()
    expect(parsePriceVariant('C')).toBeNull()
    expect(parsePriceVariant(undefined)).toBeNull()
  })

  it('random assignment splits 50/50 while the split runs', () => {
    expect(randomPriceVariant(() => 0.49, true)).toBe('A')
    expect(randomPriceVariant(() => 0.5, true)).toBe('B')
  })

  it('maps variants to env price ids and labels while the split runs', () => {
    expect(priceForVariant('A', true)).toEqual({ priceId: 'pri_a', label: '$49' })
    expect(priceForVariant('B', true)).toEqual({ priceId: 'pri_b', label: '$99' })
  })

  it('logged-out label is "from" the A label', () => {
    expect(fromPriceLabel()).toBe('from $49')
  })
})

describe('sanitizeDiscountCode', () => {
  it('keeps plain codes and rejects anything else', () => {
    expect(sanitizeDiscountCode('FOUNDING50')).toBe('FOUNDING50')
    expect(sanitizeDiscountCode(' FOUNDING50 ')).toBe('FOUNDING50')
    expect(sanitizeDiscountCode('<script>')).toBeNull()
    expect(sanitizeDiscountCode('')).toBeNull()
    expect(sanitizeDiscountCode('x'.repeat(41))).toBeNull()
    expect(sanitizeDiscountCode(42)).toBeNull()
  })
})

describe('foundingBannerText', () => {
  it('formats the end date from env, and degrades without one', () => {
    expect(foundingBannerText('2026-11-23')).toBe('Founding tester: 50% off until Nov 23')
    expect(foundingBannerText(undefined)).toBe('Founding tester: 50% off')
    expect(foundingBannerText('soon')).toBe('Founding tester: 50% off')
  })
})

describe('priceLabel', () => {
  it('accepts the escaped env form and the plain one', () => {
    expect(priceLabel('\\$49')).toBe('$49')
    expect(priceLabel('$99')).toBe('$99')
    expect(priceLabel(undefined)).toBe('')
  })
})

describe('single price (PRICE_SPLIT_ENABLED off by default)', () => {
  beforeEach(() => { delete process.env.PRICE_SPLIT_ENABLED })

  it('is off unless the env says exactly "true"', () => {
    expect(priceSplitEnabled()).toBe(false)
    expect(priceSplitEnabled('false')).toBe(false)
    expect(priceSplitEnabled('1')).toBe(false)
    expect(priceSplitEnabled('true')).toBe(true)
  })

  it('new assignments are A', () => {
    expect(randomPriceVariant(() => 0.9)).toBe('A')
    expect(randomPriceVariant(() => 0.1)).toBe('A')
  })

  it('an earlier B cookie or profile is priced as A: price id A, $49', () => {
    expect(effectiveVariant('B')).toBe('A')
    expect(priceForVariant('B')).toEqual({ priceId: 'pri_a', label: '$49' })
    expect(priceForVariant('A')).toEqual({ priceId: 'pri_a', label: '$49' })
  })

  it('PRICE_SPLIT_ENABLED=true turns the split back on', () => {
    process.env.PRICE_SPLIT_ENABLED = 'true'
    expect(priceForVariant('B')).toEqual({ priceId: 'pri_b', label: '$99' })
    expect(randomPriceVariant(() => 0.9)).toBe('B')
  })
})
