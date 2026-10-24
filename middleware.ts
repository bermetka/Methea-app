import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { startCookies, startCookieWrites } from '@/lib/start-cookies'
import { ANON_ID_COOKIE, ATTRIBUTION_COOKIE } from '@/lib/funnel-shared'
import { PRICE_VARIANT_COOKIE } from '@/lib/pricing'

export async function middleware(request: NextRequest) {
  // Sales page: set the anon id / attribution / price-variant cookies. Written to
  // the request too, so /start itself renders with them on the very first visit.
  const writes = request.nextUrl.pathname === '/start'
    ? startCookieWrites(startCookies(request.nextUrl.searchParams, {
        anonId: request.cookies.get(ANON_ID_COOKIE)?.value,
        attribution: request.cookies.get(ATTRIBUTION_COOKIE)?.value,
        variant: request.cookies.get(PRICE_VARIANT_COOKIE)?.value,
      }))
    : []
  for (const { name, value } of writes) request.cookies.set(name, value)

  const response = await updateSession(request)
  for (const { name, value, options } of writes) response.cookies.set(name, value, options)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
