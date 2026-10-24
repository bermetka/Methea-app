// Price variants (A/B test) and the founding discount code. Shared by server and
// client code — no server-only imports here. Prices and labels come from env;
// nothing about the amount is hardcoded.

export type PriceVariant = 'A' | 'B'

/** Set by the sales page (Prompt 4) to 'A' or 'B'; read once at signup. */
export const PRICE_VARIANT_COOKIE = 'methea_price_variant'

/** Session cookie holding a ?code=… discount code until checkout. */
export const DISCOUNT_CODE_COOKIE = 'methea_discount_code'

export function parsePriceVariant(value: unknown): PriceVariant | null {
  return value === 'A' || value === 'B' ? value : null
}

export function randomPriceVariant(random: () => number = Math.random): PriceVariant {
  return random() < 0.5 ? 'A' : 'B'
}

/**
 * Next's env loader expands `$NAME` in env values (both .env files and the real
 * environment, e.g. Vercel), so a bare `$49` becomes empty. Labels are therefore
 * set as `\$49`; this strips the escape if it survives (an environment that
 * doesn't expand).
 */
export function priceLabel(raw: string | undefined): string {
  return (raw ?? '').replace(/^\\\$/, '$')
}

// Literal process.env.NEXT_PUBLIC_* reads so Next inlines them into client bundles.
export function priceForVariant(variant: PriceVariant): { priceId: string; label: string } {
  return variant === 'A'
    ? { priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_A ?? '', label: priceLabel(process.env.NEXT_PUBLIC_PRICE_LABEL_A) }
    : { priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_B ?? '', label: priceLabel(process.env.NEXT_PUBLIC_PRICE_LABEL_B) }
}

/** Lowest price label, for logged-out visitors ("from $49"). */
export function fromPriceLabel(): string {
  return `from ${priceLabel(process.env.NEXT_PUBLIC_PRICE_LABEL_A)}`
}

/**
 * A discount code from the URL or a cookie. Paddle enforces amount and expiry;
 * this only rejects junk so it can't be reflected into the page or checkout.
 */
export function sanitizeDiscountCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim()
  return /^[A-Za-z0-9_-]{1,40}$/.test(code) ? code : null
}

/**
 * Founding-tester banner, e.g. "Founding tester: 50% off until Nov 23". The end
 * date comes from NEXT_PUBLIC_FOUNDING_UNTIL (YYYY-MM-DD); Paddle enforces the
 * real expiry, this is display only.
 */
export function foundingBannerText(until: string | undefined = process.env.NEXT_PUBLIC_FOUNDING_UNTIL): string {
  const date = until ? new Date(`${until}T00:00:00Z`) : null
  if (!date || Number.isNaN(date.getTime())) return 'Founding tester: 50% off'
  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `Founding tester: 50% off until ${label}`
}

/** Everything UnlockButton needs to open the right Paddle checkout. */
export interface CheckoutContext {
  priceId: string
  priceLabel: string
  discountCode: string | null
}

/** What to show where an unlock button would go. */
export type UnlockInfo = { kind: 'checkout' } & CheckoutContext
