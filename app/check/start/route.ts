import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { CHECK_COOKIE, sanitizeCheck } from '@/lib/check'
import { startProjectFromCheck } from '@/lib/check-project'

// The /check call to action. Signed in: start a project from their question
// right away. Not yet: sign-in (the auth callback picks the question up from
// the cookie, or from the sign-in link on another device).
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const cookieStore = cookies()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(`${origin}/login`)

  const check = sanitizeCheck(cookieStore.get(CHECK_COOKIE)?.value)
  if (!check) return NextResponse.redirect(`${origin}/projects`)

  const next = await startProjectFromCheck(supabase, user.id, check)
  const res = NextResponse.redirect(`${origin}${next}`)
  if (next.startsWith('/project/')) res.cookies.set(CHECK_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
