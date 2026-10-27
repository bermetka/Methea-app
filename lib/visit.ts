import { createHmac, timingSafeEqual } from 'node:crypto'
import { ANON_ID_COOKIE, ATTRIBUTION_COOKIE, sanitizeAnonId, sanitizeAttribution, type Attribution } from '@/lib/funnel-shared'
import { DISCOUNT_CODE_COOKIE, PRICE_VARIANT_COOKIE, parsePriceVariant, sanitizeDiscountCode, type PriceVariant } from '@/lib/pricing'

/**
 * The sales-page visit (Prompt 3 cookies) that signup should be credited to.
 * Normally read from cookies; when the sign-in link is opened on another
 * device the cookies aren't there, so the login page also signs the visit into
 * the link (`?carry=`) and the auth callback restores it.
 */
export interface Visit {
  anonId?: string
  attribution: Attribution
  variant?: PriceVariant
  discountCode?: string
}

type CookieReader = { get(name: string): { value: string } | undefined }

export function readVisit(cookies: CookieReader): Visit {
  return {
    anonId: sanitizeAnonId(cookies.get(ANON_ID_COOKIE)?.value) ?? undefined,
    attribution: sanitizeAttribution(cookies.get(ATTRIBUTION_COOKIE)?.value),
    variant: parsePriceVariant(cookies.get(PRICE_VARIANT_COOKIE)?.value) ?? undefined,
    discountCode: sanitizeDiscountCode(cookies.get(DISCOUNT_CODE_COOKIE)?.value) ?? undefined,
  }
}

function isEmpty(v: Visit) {
  return !v.anonId && !v.variant && !v.discountCode && Object.keys(v.attribution).length === 0
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// HMAC key derived from the service-role key (server-only, set on every
// environment), so nobody can forge a carry — e.g. to pick the cheaper variant.
function sign(payload: string, secret: string) {
  const key = createHmac('sha256', secret).update('methea-visit-carry-v1').digest()
  return createHmac('sha256', key).update(payload).digest('base64url')
}

/** The visit as a signed, URL-safe token, or null when there's nothing to carry. */
export function encodeVisit(
  visit: Visit,
  { now = Date.now(), secret = process.env.SUPABASE_SERVICE_ROLE_KEY } = {}
): string | null {
  if (!secret || isEmpty(visit)) return null
  const payload = Buffer.from(JSON.stringify({ ...visit, iat: now })).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

/** A carry token back into a visit; null if missing, forged, malformed or older than 7 days. */
export function decodeVisit(
  token: string | null | undefined,
  { now = Date.now(), secret = process.env.SUPABASE_SERVICE_ROLE_KEY } = {}
): Visit | null {
  if (!token || !secret || token.length > 2000) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = Buffer.from(sign(payload, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const raw = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof raw?.iat !== 'number' || now - raw.iat > MAX_AGE_MS || raw.iat - now > 60_000) return null
    return {
      anonId: sanitizeAnonId(raw.anonId) ?? undefined,
      attribution: sanitizeAttribution(raw.attribution),
      variant: parsePriceVariant(raw.variant) ?? undefined,
      discountCode: sanitizeDiscountCode(raw.discountCode) ?? undefined,
    }
  } catch {
    return null
  }
}

/**
 * This device's cookies win (same-device sign-in); the carried visit fills in
 * only what's missing. `restored` lists what came from the link, so the
 * callback can set those cookies on the new device.
 */
export function mergeVisit(fromCookies: Visit, carried: Visit | null) {
  const c = carried ?? { attribution: {} }
  const hasCookieAttribution = Object.keys(fromCookies.attribution).length > 0
  const visit: Visit = {
    anonId: fromCookies.anonId ?? c.anonId,
    attribution: hasCookieAttribution ? fromCookies.attribution : c.attribution,
    variant: fromCookies.variant ?? c.variant,
    discountCode: fromCookies.discountCode ?? c.discountCode,
  }
  const restored = {
    anonId: !fromCookies.anonId && !!c.anonId,
    attribution: !hasCookieAttribution && Object.keys(c.attribution).length > 0,
    variant: !fromCookies.variant && !!c.variant,
    discountCode: !fromCookies.discountCode && !!c.discountCode,
  }
  const variantSource = fromCookies.variant ? 'cookie' : c.variant ? 'link' : 'random'
  return { visit, restored, variantSource } as const
}
