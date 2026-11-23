import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { startProjectFromCheck } from '@/lib/check-project'
import { findGuestProject, guestProjectPath } from '@/lib/guest'
import { linkAnonEvents, trackEvent } from '@/lib/funnel'
import { ATTRIBUTION_COOKIE, sanitizeAttribution } from '@/lib/funnel-shared'

export const dynamic = 'force-dynamic'

/**
 * GET /go/brief — paid ads land straight in a new project's brief (Gate 1), no
 * landing page and no sign-up: a guest (Supabase anonymous user) like /check/start,
 * but without a topic carried over. Middleware has already set the attribution
 * cookies (angle `direct` + utm_*); the visit is recorded as start_view.
 */
// Link previews and crawlers (Meta's ad review included) must not create guest
// accounts and projects: they get the landing page instead.
const BOT_UA = /bot|crawl|spider|preview|facebookexternalhit|facebot|meta-externalagent|slack|whatsapp|telegram|headless/i

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  if (BOT_UA.test(request.headers.get('user-agent') ?? '')) return NextResponse.redirect(`${origin}/proposal?v=short`)
  const supabase = createClient()
  let { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    await trackEvent('start_view', { props: sanitizeAttribution(cookies().get(ATTRIBUTION_COOKIE)?.value) })
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      console.error('[go/brief] guest sign-in failed:', error?.message ?? 'no user')
      return NextResponse.redirect(`${origin}/proposal`)
    }
    user = data.user
    await linkAnonEvents(user.id)
  } else if (user.is_anonymous) {
    // A guest already has their one project: back to it.
    const existing = await findGuestProject(supabase, user.id)
    if (existing) return NextResponse.redirect(`${origin}${guestProjectPath(existing.id, existing.gate1Done)}`)
  }

  const next = await startProjectFromCheck(supabase, user.id, { q: '', path: 'program', stage: 'who' })
  return NextResponse.redirect(`${origin}${next}`)
}
