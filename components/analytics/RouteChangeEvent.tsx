'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { pushDataLayer } from '@/lib/consent'

/**
 * App Router navigations don't reload the page, so GTM's page-load triggers
 * fire once. This pushes {event:'page_view', page_path} on every later
 * pathname change (not the first load — GTM's own page view covers that).
 * Chosen over GTM's History Change trigger, which Next can fire twice per
 * navigation (pushState + replaceState). In GTM: Custom Event "page_view".
 */
export default function RouteChangeEvent() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (last.current === null) {
      last.current = pathname
      return
    }
    if (pathname === last.current) return
    last.current = pathname
    pushDataLayer({ event: 'page_view', page_path: pathname })
  }, [pathname])

  return null
}
