import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DISCOUNT_CODE_COOKIE, sanitizeDiscountCode } from '@/lib/pricing'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must not run any logic between createServerClient and getUser
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect /onboarding and /project routes
  const protectedPaths = ['/onboarding', '/project']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return keepDiscountCode(request, NextResponse.redirect(url))
  }

  return keepDiscountCode(request, supabaseResponse)
}

// ?code=XXX (founding discount from the tester email): keep it for this browser
// session so it reaches Paddle checkout later — also across the login redirect.
// Paddle validates the code itself. /auth/callback's ?code= is Supabase's sign-in
// code, not a discount code, so it's skipped.
function keepDiscountCode(request: NextRequest, response: NextResponse): NextResponse {
  if (request.nextUrl.pathname.startsWith('/auth/callback')) return response
  const discountCode = sanitizeDiscountCode(request.nextUrl.searchParams.get('code'))
  if (discountCode) {
    response.cookies.set(DISCOUNT_CODE_COOKIE, discountCode, {
      path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: true,
    })
  }
  return response
}
