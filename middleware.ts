import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { startCookies, startCookieWrites } from '@/lib/start-cookies'
import { ANON_ID_COOKIE, ATTRIBUTION_COOKIE, sanitizeAttribution } from '@/lib/funnel-shared'
import { PRICE_VARIANT_COOKIE } from '@/lib/pricing'
import { ANALYTICS_OFF_COOKIE, analyticsOffCookieOptions } from '@/lib/consent'

export async function middleware(request: NextRequest) {
  // Pages people land on from outside (sales page, the check, blog posts): set the
  // anon id / attribution / price-variant cookies so the funnel credits the source.
  // Written to the request too, so the page renders with them on the very first visit.
  const path = request.nextUrl.pathname
  const landing = path === '/start' || path === '/check' || path === '/blog' || path.startsWith('/blog/')
  const writes = landing
    ? startCookieWrites(startCookies(request.nextUrl.searchParams, {
        anonId: request.cookies.get(ANON_ID_COOKIE)?.value,
        attribution: request.cookies.get(ATTRIBUTION_COOKIE)?.value,
        variant: request.cookies.get(PRICE_VARIANT_COOKIE)?.value,
      }))
    : []
  for (const { name, value } of writes) request.cookies.set(name, value)

  const response = await updateSession(request)
  for (const { name, value, options } of writes) response.cookies.set(name, value, options)

  // Test visits (utm_source=test in the URL or the stored attribution): no
  // conversion events from this browser. Set on this response, so it already
  // applies to the page being loaded.
  if (!request.cookies.get(ANALYTICS_OFF_COOKIE) && isTestVisit(request)) {
    response.cookies.set(ANALYTICS_OFF_COOKIE, '1', analyticsOffCookieOptions())
  }
  return response
}

function isTestVisit(request: NextRequest): boolean {
  if (request.nextUrl.searchParams.get('utm_source')?.toLowerCase() === 'test') return true
  return sanitizeAttribution(request.cookies.get(ATTRIBUTION_COOKIE)?.value).utm_source?.toLowerCase() === 'test'
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
