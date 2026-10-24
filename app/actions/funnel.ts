'use server'

import { trackEvent } from '@/lib/funnel'
import { sanitizeAttribution } from '@/lib/funnel-shared'
import { parsePriceVariant } from '@/lib/pricing'

// Client-triggered funnel events. Each validates its input — server actions are
// callable directly — and records as the current visitor (RLS-scoped).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function trackUnlockClick(projectId: string) {
  if (!UUID.test(projectId)) return
  await trackEvent('unlock_click', { once: projectId })
}

/** Sales page (Prompt 4): angle, price variant and utm_* of this view. */
export async function trackStartView(props: { price_variant?: string } & Record<string, unknown>) {
  const variant = parsePriceVariant(props.price_variant)
  await trackEvent('start_view', {
    props: { ...sanitizeAttribution(props), ...(variant && { price_variant: variant }) },
  })
}

/** "Request a pilot" (institutions). */
export async function trackPilotRequest() {
  await trackEvent('pilot_request', { once: 'pilot' })
}

/** Fake-door "Monthly $15" button (Prompt 4). */
export async function trackMonthlyWaitlist() {
  await trackEvent('monthly_waitlist', { once: 'monthly' })
}
