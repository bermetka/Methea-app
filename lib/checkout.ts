import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { accessUntil, isAccessExpired } from '@/lib/entitlement'
import {
  DISCOUNT_CODE_COOKIE,
  PRICE_VARIANT_COOKIE,
  parsePriceVariant,
  priceForVariant,
  randomPriceVariant,
  sanitizeDiscountCode,
  type CheckoutContext,
  type PriceVariant,
  type UnlockInfo,
} from '@/lib/pricing'
import type { Project } from '@/types/database'

/**
 * Create the user's profile with their price variant if it doesn't exist yet.
 * The variant comes from the sales-page cookie if present, otherwise 50/50.
 * Set once: the insert ignores an existing row, and a DB trigger rejects any
 * later change. Uses the service-role client because users have no INSERT or
 * UPDATE grant on profiles — otherwise they could pick the cheaper variant.
 */
export async function ensureProfile(userId: string): Promise<PriceVariant> {
  const cookieVariant = parsePriceVariant(cookies().get(PRICE_VARIANT_COOKIE)?.value)
  const variant = cookieVariant ?? randomPriceVariant()

  const admin = createServiceRoleClient()
  await admin.from('profiles').upsert(
    {
      id: userId,
      price_variant: variant,
      signup_source: { variant_source: cookieVariant ? 'cookie' : 'random' },
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { data } = await admin.from('profiles').select('price_variant').eq('id', userId).single()
  return parsePriceVariant(data?.price_variant) ?? variant
}

/** The user's stored variant; creates the profile if the auth callback never ran for them. */
export async function getUserPriceVariant(userId: string): Promise<PriceVariant> {
  const admin = createServiceRoleClient()
  const { data } = await admin.from('profiles').select('price_variant').eq('id', userId).maybeSingle()
  return parsePriceVariant(data?.price_variant) ?? ensureProfile(userId)
}

export async function getCheckoutContext(userId: string): Promise<CheckoutContext> {
  const { priceId, label } = priceForVariant(await getUserPriceVariant(userId))
  return {
    priceId,
    priceLabel: label,
    discountCode: sanitizeDiscountCode(cookies().get(DISCOUNT_CODE_COOKIE)?.value),
  }
}

export function formatAccessDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * What an unpaid project's unlock slot shows. An expired project can't be
 * re-unlocked by paying again (the webhook only sets paid_at once), so it gets
 * a notice instead of a checkout button.
 */
export async function getUnlockInfo(project: Pick<Project, 'paid_at'>, userId: string): Promise<UnlockInfo> {
  if (isAccessExpired(project)) {
    return { kind: 'expired', endedOn: formatAccessDate(accessUntil(project)!) }
  }
  return { kind: 'checkout', ...(await getCheckoutContext(userId)) }
}
