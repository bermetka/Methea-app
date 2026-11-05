// Cookie consent (Consent Mode v2) and GTM dataLayer helpers. UK GDPR/PECR:
// ad and analytics storage stay denied until the visitor accepts.

/** First-party cookie holding the visitor's choice: 'granted' | 'denied'. */
export const CONSENT_COOKIE = 'methea_consent'
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365 // 12 months

/** Short-lived cookie the auth callback sets on a brand-new account; read once for the sign_up conversion. */
export const SIGNUP_EVENT_COOKIE = 'methea_signup_event'

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

export function saveConsent(choice: ConsentChoice) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`
  if (choice === 'granted') {
    gtag('consent', 'update', Object.fromEntries(CONSENT_KEYS.map(k => [k, 'granted'])))
    pushDataLayer({ event: 'consent_granted' })
  }
}
