// Funnel event names and the first-party cookies the sales page (Prompt 4) sets.
// Shared by server and client code — no server-only imports here.

export const FUNNEL_EVENTS = [
  'start_view', 'signup', 'brief_submitted', 'gate1_done', 'theories_no_fit',
  'framework_diagram_viewed', 'paywall_view', 'unlock_click', 'purchase',
  'pilot_request', 'monthly_waitlist',
] as const
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

/** Random id for a not-yet-signed-up visitor; set by the sales page. */
export const ANON_ID_COOKIE = 'methea_anon_id'

/** JSON {angle, utm_source, utm_medium, utm_campaign, utm_content, utm_term}; set by the sales page. */
export const ATTRIBUTION_COOKIE = 'methea_attribution'

/** Sales-page hero angles (?a=), also the funnel's `angle`. */
export const START_ANGLES = ['question', 'lens', 'deadline'] as const
export type StartAngle = (typeof START_ANGLES)[number]
export const DEFAULT_ANGLE: StartAngle = 'question'

export function parseAngle(value: unknown): StartAngle | null {
  return (START_ANGLES as readonly unknown[]).includes(value) ? (value as StartAngle) : null
}

export const ATTRIBUTION_KEYS = ['angle', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export type Attribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[number], string>>

export function sanitizeAnonId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : null
}

/** Keep only known keys with short plain values — the cookie is client-controlled. */
export function sanitizeAttribution(raw: unknown): Attribution {
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) } catch { return {} }
  }
  if (!obj || typeof obj !== 'object') return {}
  const out: Attribution = {}
  for (const key of ATTRIBUTION_KEYS) {
    const v = (obj as Record<string, unknown>)[key]
    if (typeof v === 'string' && v.length > 0 && v.length <= 100) out[key] = v
  }
  return out
}
