'use client'

import { useEffect } from 'react'
import { pushDataLayer, readCookie, SIGNUP_EVENT_COOKIE } from '@/lib/consent'

/**
 * GTM sign_up conversion. The auth callback sets a 5-minute cookie only when
 * it created a new profile; this pushes once and deletes it, so logins and
 * reloads never re-fire.
 */
export default function SignupEvent() {
  useEffect(() => {
    const method = readCookie(SIGNUP_EVENT_COOKIE)
    if (!method) return
    document.cookie = `${SIGNUP_EVENT_COOKIE}=; Max-Age=0; Path=/`
    pushDataLayer({ event: 'sign_up', method })
  }, [])
  return null
}
