import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCheckoutContext } from './checkout'

// vi.mock calls below are hoisted above the import.

// Cookies the request carries, and the profile row the service-role client returns.
const jar = new Map<string, string>()
let profileVariant: string | null = null

vi.mock('next/headers', () => ({
  cookies: () => ({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}))
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: profileVariant ? { price_variant: profileVariant } : null }) }),
      }),
    }),
  }),
}))
vi.mock('@/lib/funnel', () => ({ trackEvent: vi.fn() }))

beforeEach(() => {
  jar.clear()
  delete process.env.PRICE_SPLIT_ENABLED
  process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_A = 'pri_a'
  process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_B = 'pri_b'
  process.env.NEXT_PUBLIC_PRICE_LABEL_A = '$49'
  process.env.NEXT_PUBLIC_PRICE_LABEL_B = '$99'
})

describe('getCheckoutContext with the price split off', () => {
  it('profile B + FOUNDING50: checkout opens on price A ($49) with the discount code', async () => {
    profileVariant = 'B'
    jar.set('methea_discount_code', 'FOUNDING50')
    expect(await getCheckoutContext({ id: 'user-b', email: 'b@example.com' })).toEqual({
      priceId: 'pri_a',
      priceLabel: '$49',
      discountCode: 'FOUNDING50',
      customerEmail: 'b@example.com',
    })
  })

  it('profile B without a code: price A, no discount', async () => {
    profileVariant = 'B'
    const ctx = await getCheckoutContext({ id: 'user-b' })
    expect(ctx).toMatchObject({ priceId: 'pri_a', priceLabel: '$49', discountCode: null })
  })

  it('with the split on, profile B keeps price B', async () => {
    process.env.PRICE_SPLIT_ENABLED = 'true'
    profileVariant = 'B'
    expect(await getCheckoutContext({ id: 'user-b' })).toMatchObject({ priceId: 'pri_b', priceLabel: '$99' })
  })
})
