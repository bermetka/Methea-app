import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { CHECK_COOKIE, sanitizeCheck } from '@/lib/check'
import { startProjectFromCheck } from '@/lib/check-project'
import { findGuestProject, guestProjectPath } from '@/lib/guest'
import { linkAnonEvents } from '@/lib/funnel'

// The /check call to action. Signed in: start a project from their question
// right away. Not yet: start as a guest (Supabase anonymous user) — brief and
// Gate 1 without an account; we ask for an email after Gate 1. If anonymous
// sign-in fails (e.g. switched off), fall back to sign-in as before: the auth
// callback picks the question up from the cookie.
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const cookieStore = cookies()
  const supabase = createClient()
  let { data: { user } } = await supabase.auth.getUser()

  // A guest already has their one project: back to it.
  if (user?.is_anonymous) {
    const existing = await findGuestProject(supabase, user.id)
    if (existing) return NextResponse.redirect(`${origin}${guestProjectPath(existing.id, existing.gate1Done)}`)
  }

  const check = sanitizeCheck(cookieStore.get(CHECK_COOKIE)?.value)

  if (!user) {
    if (!check) return NextResponse.redirect(`${origin}/login`)
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      console.error('[check] guest sign-in failed:', error?.message ?? 'no user')
      return NextResponse.redirect(`${origin}/login`)
    }
    user = data.user
    // Pre-signup events (check_view, check_complete, check_cta) follow the guest.
    await linkAnonEvents(user.id)
  }

  if (!check) return NextResponse.redirect(`${origin}/projects`)

  const next = await startProjectFromCheck(supabase, user.id, check)
  const res = NextResponse.redirect(`${origin}${next}`)
  if (next.startsWith('/project/')) res.cookies.set(CHECK_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
