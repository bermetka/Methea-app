import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { trackEvent } from '@/lib/funnel'
import { readVisit, type Visit } from '@/lib/visit'
import {
  DISCOUNT_CODE_COOKIE,
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
 * The variant comes from the sales-page visit if present, otherwise 50/50;
 * the visit's attribution (angle, utm_*) goes into signup_source. The visit
 * defaults to this request's cookies; the auth callback passes one restored
 * from the sign-in link when the link was opened on another device.
 * Set once: the insert ignores an existing row, and a DB trigger rejects any
 * later change. Uses the service-role client because users have no INSERT or
 * UPDATE grant on profiles — otherwise they could pick the cheaper variant.
 * `created` is true only for the call that actually created the profile.
 */
export async function ensureProfile(
  userId: string,
  visit: Visit = readVisit(cookies()),
  variantSource: 'cookie' | 'link' | 'random' = visit.variant ? 'cookie' : 'random'
): Promise<{ variant: PriceVariant; created: boolean }> {
  const variant = visit.variant ?? randomPriceVariant()

  const admin = createServiceRoleClient()
  // ignoreDuplicates + select returns the row only when it was inserted.
  const { data: inserted } = await admin
    .from('profiles')
    .upsert(
      {
        id: userId,
        price_variant: variant,
        signup_source: { variant_source: variantSource, ...visit.attribution },
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select('price_variant')
  if (inserted?.length) return { variant, created: true }

  const { data } = await admin.from('profiles').select('price_variant').eq('id', userId).single()
  return { variant: parsePriceVariant(data?.price_variant) ?? variant, created: false }
}

/** The user's stored variant; creates the profile if the auth callback never ran for them. */
export async function getUserPriceVariant(userId: string): Promise<PriceVariant> {
  const admin = createServiceRoleClient()
  const { data } = await admin.from('profiles').select('price_variant').eq('id', userId).maybeSingle()
  return parsePriceVariant(data?.price_variant) ?? (await ensureProfile(userId)).variant
}

// The account email prefills Paddle checkout, so the receipt (and refund
// link) goes to the address the student actually signs in with.
export async function getCheckoutContext(user: { id: string; email?: string }): Promise<CheckoutContext> {
  const { priceId, label } = priceForVariant(await getUserPriceVariant(user.id))
  return {
    priceId,
    priceLabel: label,
    discountCode: sanitizeDiscountCode(cookies().get(DISCOUNT_CODE_COOKIE)?.value),
    customerEmail: user.email ?? null,
  }
}

export function formatAccessDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * What an unpaid project's unlock slot shows — and the funnel's paywall_view
 * (pages call this exactly when they render an unlock prompt). Once the
 * webhook allows re-buy, expired projects get the checkout button too.
 */
export async function getUnlockInfo(
  project: Pick<Project, 'id' | 'paid_at'>,
  user: { id: string; email?: string }
): Promise<UnlockInfo> {
  await trackEvent('paywall_view', { once: project.id })
  return { kind: 'checkout', ...(await getCheckoutContext(user)) }
}
