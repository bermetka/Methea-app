// Cookie consent (Consent Mode v2) and GTM dataLayer helpers. UK GDPR/PECR:
// ad and analytics storage stay denied until the visitor accepts.

/** First-party cookie holding the visitor's choice: 'granted' | 'denied'. */
export const CONSENT_COOKIE = 'methea_consent'
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365 // 12 months

/** Short-lived cookie the auth callback sets on a brand-new account; read once for the sign_up conversion. */
export const SIGNUP_EVENT_COOKIE = 'methea_signup_event'

/**
 * Set (not httpOnly) for browsers excluded from analytics: utm_source=test
 * visits (middleware) and unlimited / test-signup accounts (auth callback).
 * While present, conversion events aren't pushed. GTM and the banner still run.
 */
export const ANALYTICS_OFF_COOKIE = 'methea_analytics_off'

/** Cookie options for server writes of ANALYTICS_OFF_COOKIE (client-readable). */
export function analyticsOffCookieOptions() {
  return { path: '/', sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: CONSENT_MAX_AGE }
}

export type ConsentChoice = 'granted' | 'denied'

const CONSENT_KEYS = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'] as const

/**
 * Runs before GTM: default everything to denied, then re-apply a stored
 * 'granted' straight away so returning visitors don't wait for the banner.
 */
export const CONSENT_DEFAULT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied', analytics_storage:'denied', wait_for_update:500});
if (/(?:^|; )${CONSENT_COOKIE}=granted(?:;|$)/.test(document.cookie)) {
  gtag('consent', 'update', {ad_storage:'granted', ad_user_data:'granted', ad_personalization:'granted', analytics_storage:'granted'});
}
`

type DataLayerWindow = Window & { dataLayer?: unknown[] }

export function pushDataLayer(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const w = window as DataLayerWindow
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push(payload)
}

export function isAnalyticsExcluded(): boolean {
  return readCookie(ANALYTICS_OFF_COOKIE) === '1'
}

/** Conversion events (quiz_complete, sign_up, begin_checkout, purchase): skipped for excluded browsers. */
export function pushConversion(payload: Record<string, unknown> & { event: string }) {
  try {
    if (typeof window === 'undefined' || isAnalyticsExcluded()) return
    pushDataLayer(payload)
  } catch {
    // Analytics must never break a page or a checkout.
  }
}

/** gtag() pushes the arguments object itself, which is what Consent Mode reads. */
function gtag(..._args: unknown[]) {
  if (typeof window === 'undefined') return
  const w = window as DataLayerWindow
  w.dataLayer = w.dataLayer || []
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments)
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

export function readConsent(): ConsentChoice | null {
  const v = readCookie(CONSENT_COOKIE)
  return v === 'granted' || v === 'denied' ? v : null
}

/**
 * Store the choice and tell Consent Mode. Accept → update granted +
 * consent_granted. Reject after an earlier Accept → update denied +
 * consent_revoked, and the ad/analytics cookies already set are removed.
 */
export function saveConsent(choice: ConsentChoice) {
  const previous = readConsent()
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`
  if (choice === 'granted') {
    gtag('consent', 'update', Object.fromEntries(CONSENT_KEYS.map(k => [k, 'granted'])))
    pushDataLayer({ event: 'consent_granted' })
  } else if (previous === 'granted') {
    gtag('consent', 'update', Object.fromEntries(CONSENT_KEYS.map(k => [k, 'denied'])))
    pushDataLayer({ event: 'consent_revoked' })
    clearTrackingCookies()
  }
}

// First-party cookies Google Ads / GA / the Meta Pixel set after consent.
const TRACKING_COOKIE = /^(_gcl_\w+|_ga(_\w+)?|_gid|_fbp|_fbc)$/

/** Best effort: delete them on this host and on each parent domain (GTM sets them on the top domain). */
function clearTrackingCookies() {
  const names = document.cookie.split('; ').map(c => c.split('=')[0]).filter(n => TRACKING_COOKIE.test(n))
  const parts = location.hostname.split('.')
  const domains = [''].concat(parts.slice(0, -1).map((_, i) => `; Domain=.${parts.slice(i).join('.')}`))
  for (const name of names) {
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/${domain}`
  }
}

/** Event the footer "Cookie settings" link fires; CookieBanner listens and reopens. */
export const COOKIE_SETTINGS_EVENT = 'methea:cookie-settings'

export function openCookieSettings() {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))
}
