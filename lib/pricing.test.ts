import { describe, it, expect, beforeEach } from 'vitest'
import {
  parsePriceVariant,
  randomPriceVariant,
  priceForVariant,
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

  it('random assignment splits 50/50', () => {
    expect(randomPriceVariant(() => 0.49)).toBe('A')
    expect(randomPriceVariant(() => 0.5)).toBe('B')
  })

  it('maps variants to env price ids and labels', () => {
    expect(priceForVariant('A')).toEqual({ priceId: 'pri_a', label: '$49' })
    expect(priceForVariant('B')).toEqual({ priceId: 'pri_b', label: '$99' })
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
