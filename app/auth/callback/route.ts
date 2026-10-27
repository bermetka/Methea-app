import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'
import { ensureProfile } from '@/lib/checkout'
import { linkAnonEvents, trackServerEvent } from '@/lib/funnel'
import { startCookieWrites } from '@/lib/start-cookies'
import { DEFAULT_ANGLE } from '@/lib/funnel-shared'
import { DISCOUNT_CODE_COOKIE } from '@/lib/pricing'
import { decodeVisit, mergeVisit, readVisit } from '@/lib/visit'

const EMAIL_OTP_TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change']

// Two ways in:
// - ?code=        PKCE (Google, and email links opened in the browser that asked for them)
// - ?token_hash=  email links from the Supabase templates — work on any device,
//                 because the token is verified here on the server.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const otpType = EMAIL_OTP_TYPES.find(t => t === searchParams.get('type'))
  const rawNext = searchParams.get('next') ?? '/projects'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/projects'

  if (code || (tokenHash && otpType)) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: otpType! })
    if (!error && data.user) {
      // The sales-page visit: this device's cookies, else the one the login page
      // signed into the link (sign-in link opened on another device).
      const { visit, restored, variantSource } = mergeVisit(readVisit(cookieStore), decodeVisit(searchParams.get('carry')))
      // Assign the price variant once, at signup (no-op for returning users).
      // Never block login on it — getUserPriceVariant creates it lazily too.
      try {
        const { variant, created } = await ensureProfile(data.user.id, visit, variantSource)
        if (created) {
          // Service role: the new session cookie isn't readable within this request yet.
          await trackServerEvent('signup', data.user.id, {
            props: { ...visit.attribution, price_variant: variant },
            once: data.user.id,
          })
        }
        await linkAnonEvents(data.user.id, visit.anonId)
      } catch (e) {
        console.error('Profile creation failed:', e)
      }

      // On a new device, keep the restored visit for later events and checkout.
      if (visit.anonId && visit.variant) {
        const writes = startCookieWrites({
          anonId: visit.anonId,
          attribution: { ...visit.attribution, angle: visit.attribution.angle ?? DEFAULT_ANGLE },
          variant: visit.variant,
        })
        const keep = [restored.anonId, restored.attribution, restored.variant]
        writes.forEach((w, i) => { if (keep[i]) cookieStore.set(w.name, w.value, w.options) })
      }
      if (restored.discountCode && visit.discountCode) {
        cookieStore.set(DISCOUNT_CODE_COOKIE, visit.discountCode, {
          path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: true,
        })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Auth callback error:', error?.message ?? 'no user')
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
