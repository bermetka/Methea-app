import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  ANON_ID_COOKIE,
  ATTRIBUTION_COOKIE,
  sanitizeAnonId,
  sanitizeAttribution,
  type Attribution,
  type FunnelEvent,
} from '@/lib/funnel-shared'

/**
 * Record a funnel event as the current visitor (their own Supabase session, so
 * RLS applies: a user can only write rows for themselves). `once` makes it
 * once-per-key (e.g. a project id) — repeats are silently ignored. Never throws:
 * analytics must not break a page or an action.
 */
export async function trackEvent(
  event: FunnelEvent,
  { props = {}, once }: { props?: Record<string, unknown>; once?: string } = {}
): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const anonId = sanitizeAnonId(cookies().get(ANON_ID_COOKIE)?.value)
    const dedupeKey = once ? `${event}:${user?.id ?? anonId ?? 'unknown'}:${once}` : null

    // No .select(): the client has no SELECT on funnel_events.
    const { error } = await supabase.from('funnel_events').insert({
      user_id: user?.id ?? null,
      anon_id: anonId,
      event,
      props,
      dedupe_key: dedupeKey,
    })
    if (error && error.code !== '23505') console.error(`[funnel] ${event} not recorded:`, error.message)
  } catch (err) {
    console.error(`[funnel] ${event} not recorded:`, err)
  }
}

/**
 * Server-to-server events with no visitor session (the Paddle webhook) or that
 * must be written before the session cookie is readable (signup in the auth
 * callback). Service role: bypasses RLS. Never throws.
 */
export async function trackServerEvent(
  event: FunnelEvent,
  userId: string | null,
  { props = {}, once }: { props?: Record<string, unknown>; once?: string } = {}
): Promise<void> {
  try {
    const { error } = await createServiceRoleClient().from('funnel_events').insert({
      user_id: userId,
      event,
      props,
      dedupe_key: once ? `${event}:${once}` : null,
    })
    if (error && error.code !== '23505') console.error(`[funnel] ${event} not recorded:`, error.message)
  } catch (err) {
    console.error(`[funnel] ${event} not recorded:`, err)
  }
}

/** The sales-page attribution cookie (angle, utm_*), sanitised. */
export function readAttribution(): Attribution {
  return sanitizeAttribution(cookies().get(ATTRIBUTION_COOKIE)?.value)
}

/**
 * At signup: attach the visitor's anonymous (pre-signup) events to their new
 * user id, so the funnel follows one person from the sales page onwards.
 */
export async function linkAnonEvents(
  userId: string,
  anonId = sanitizeAnonId(cookies().get(ANON_ID_COOKIE)?.value)
): Promise<void> {
  if (!anonId) return
  try {
    const { error } = await createServiceRoleClient()
      .from('funnel_events')
      .update({ user_id: userId })
      .eq('anon_id', anonId)
      .is('user_id', null)
    if (error) console.error('[funnel] linking anon events failed:', error.message)
  } catch (err) {
    console.error('[funnel] linking anon events failed:', err)
  }
}
