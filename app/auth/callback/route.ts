import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ensureProfile } from '@/lib/checkout'
import { linkAnonEvents, readAttribution, trackServerEvent } from '@/lib/funnel'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/projects'

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Assign the price variant once, at signup (no-op for returning users).
      // Never block login on it — getUserPriceVariant creates it lazily too.
      try {
        const { variant, created } = await ensureProfile(data.user.id)
        if (created) {
          // Service role: the new session cookie isn't readable within this request yet.
          await trackServerEvent('signup', data.user.id, {
            props: { ...readAttribution(), price_variant: variant },
            once: data.user.id,
          })
        }
        await linkAnonEvents(data.user.id)
      } catch (e) {
        console.error('Profile creation failed:', e)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Auth callback error:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
