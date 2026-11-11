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

/**
 * The A/B price split runs only when PRICE_SPLIT_ENABLED=true (server env, off by
 * default). Off: every visitor and every account is priced as A, including
 * earlier B cookies and B profiles. The stored variant stays as it was, so past
 * A/B data keeps its meaning; the price actually paid is paid_price_variant.
 */
export function priceSplitEnabled(raw: string | undefined = process.env.PRICE_SPLIT_ENABLED): boolean {
  return raw === 'true'
}

/** The variant a visitor or account is actually priced at. */
export function effectiveVariant(variant: PriceVariant, splitEnabled = priceSplitEnabled()): PriceVariant {
  return splitEnabled ? variant : 'A'
}

/** New assignment: 50/50 while the split runs, otherwise A. */
export function randomPriceVariant(random: () => number = Math.random, splitEnabled = priceSplitEnabled()): PriceVariant {
  if (!splitEnabled) return 'A'
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
// Server-only callers: PRICE_SPLIT_ENABLED isn't exposed to the client (reads as off there).
export function priceForVariant(variant: PriceVariant, splitEnabled = priceSplitEnabled()): { priceId: string; label: string } {
  return effectiveVariant(variant, splitEnabled) === 'A'
    ? { priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_A ?? '', label: priceLabel(process.env.NEXT_PUBLIC_PRICE_LABEL_A) }
    : { priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_B ?? '', label: priceLabel(process.env.NEXT_PUBLIC_PRICE_LABEL_B) }
}

/** What's free and what a paid project adds. Single source for the marketing pages. */
export const FREE_FEATURES = ['Brief upload', 'Research-question refinement', 'Theory suggestions', 'Framework diagram (watermarked export)']
export const PAID_FEATURES = [
  'Full framework narrative with verified citations',
  'Methodology chain',
  'Interview guide',
  'Transcript analysis',
  'Full export, no watermark',
]

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
  customerEmail: string | null
  /** A guest who gave this email but hasn't confirmed it yet: confirm before checkout. */
  confirmEmailFirst?: string | null
}

/** What to show where an unlock button would go. */
export type UnlockInfo = { kind: 'checkout' } & CheckoutContext

/** "$49", "US$24.50" → 49 / 24.5; null when there's no number. */
export function priceFromLabel(label: string | undefined | null): number | null {
  const m = label?.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  const n = m ? Number(m[0]) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}
