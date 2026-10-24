import { describe, it, expect, beforeEach } from 'vitest'
import { metheaVariantOf, paymentRecordFromTransaction, type TransactionLike } from './payment-record'

beforeEach(() => {
  process.env.PADDLE_PRICE_ID_A = 'pri_a'
  process.env.PADDLE_PRICE_ID_B = 'pri_b'
})

const base: TransactionLike = {
  id: 'txn_1',
  currencyCode: 'USD',
  discountId: null,
  customData: { project_id: 'p1' },
  details: { totals: { grandTotal: '9900' } },
  items: [{ price: { id: 'pri_b' } }],
}

describe('paymentRecordFromTransaction', () => {
  it('records grand_total in minor units, currency, and the charged variant', () => {
    expect(paymentRecordFromTransaction(base)).toEqual({
      paddle_transaction_id: 'txn_1',
      amount_paid: 9900,
      currency: 'USD',
      paid_price_variant: 'B',
      discount_code: null,
    })
  })

  it('records the discount code from customData when Paddle applied a discount', () => {
    const tx = { ...base, discountId: 'dsc_1', customData: { project_id: 'p1', discount_code: 'FOUNDING50' }, details: { totals: { grandTotal: '4950' } } }
    expect(paymentRecordFromTransaction(tx)).toMatchObject({ amount_paid: 4950, discount_code: 'FOUNDING50' })
  })

  it('falls back to the discount id, and ignores a code Paddle did not apply', () => {
    expect(paymentRecordFromTransaction({ ...base, discountId: 'dsc_1', customData: {} }).discount_code).toBe('dsc_1')
    expect(paymentRecordFromTransaction({ ...base, customData: { discount_code: 'FOUNDING50' } }).discount_code).toBeNull()
  })

  it('handles a missing total and an unknown price', () => {
    const tx = { ...base, details: null, items: [{ price: { id: 'pri_other' } }] }
    expect(paymentRecordFromTransaction(tx)).toMatchObject({ amount_paid: null, paid_price_variant: null })
  })
})

describe('metheaVariantOf (shared Paddle account)', () => {
  it('recognises only our server-side price ids, on any line item', () => {
    expect(metheaVariantOf({ items: [{ price: { id: 'pri_a' } }] })).toBe('A')
    expect(metheaVariantOf({ items: [{ price: { id: 'pri_onion' } }, { price: { id: 'pri_b' } }] })).toBe('B')
    expect(metheaVariantOf({ items: [{ price: { id: 'pri_onion' } }] })).toBeNull()
    expect(metheaVariantOf({ items: [{ price: null }] })).toBeNull()
  })

  it('never matches when the server env is unset', () => {
    delete process.env.PADDLE_PRICE_ID_A
    delete process.env.PADDLE_PRICE_ID_B
    expect(metheaVariantOf({ items: [{ price: { id: '' } }] })).toBeNull()
    expect(metheaVariantOf({ items: [{ price: { id: 'pri_a' } }] })).toBeNull()
  })
})
