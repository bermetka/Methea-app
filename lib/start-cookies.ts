import {
  ANON_ID_COOKIE,
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_KEYS,
  DEFAULT_ANGLE,
  parseAngle,
  sanitizeAnonId,
  sanitizeAttribution,
  type Attribution,
} from '@/lib/funnel-shared'
import { PRICE_VARIANT_COOKIE, parsePriceVariant, randomPriceVariant, type PriceVariant } from '@/lib/pricing'

export interface StartCookies {
  anonId: string
  attribution: Attribution & { angle: string }
  variant: PriceVariant
}

/**
 * The sales page's first-party cookies (Prompt 3 contract), from the URL and
 * whatever the visitor already has:
 * - anon id: kept if valid, else a new one;
 * - attribution: from ?a= and utm_* when the URL carries any, else the existing
 *   cookie (a later visit without params doesn't wipe the original source);
 * - price variant: ?p=A|B, else the existing cookie, else 50/50.
 */
export function startCookies(
  search: URLSearchParams,
  existing: { anonId?: string; attribution?: string; variant?: string },
  { random = Math.random, newId = () => crypto.randomUUID() } = {}
): StartCookies {
  const anonId = sanitizeAnonId(existing.anonId) ?? newId()

  const fromUrl = search.has('a') || ATTRIBUTION_KEYS.some(k => k !== 'angle' && search.has(k))
  const raw: Attribution = fromUrl
    ? sanitizeAttribution(Object.fromEntries(ATTRIBUTION_KEYS.map(k => [k, search.get(k) ?? undefined])))
    : sanitizeAttribution(existing.attribution)
  const attribution = { ...raw, angle: parseAngle(fromUrl ? search.get('a') : raw.angle) ?? DEFAULT_ANGLE }

  const variant = parsePriceVariant(search.get('p')) ?? parsePriceVariant(existing.variant) ?? randomPriceVariant(random)

  return { anonId, attribution, variant }
}

const DAY = 60 * 60 * 24

/** Cookie writes for a StartCookies result (readable by the server on later requests). */
export function startCookieWrites({ anonId, attribution, variant }: StartCookies) {
  const base = { path: '/', sameSite: 'lax' as const, httpOnly: true, secure: process.env.NODE_ENV === 'production' }
  return [
    { name: ANON_ID_COOKIE, value: anonId, options: { ...base, maxAge: 365 * DAY } },
    { name: ATTRIBUTION_COOKIE, value: JSON.stringify(attribution), options: { ...base, maxAge: 90 * DAY } },
    { name: PRICE_VARIANT_COOKIE, value: variant, options: { ...base, maxAge: 90 * DAY } },
  ]
}
