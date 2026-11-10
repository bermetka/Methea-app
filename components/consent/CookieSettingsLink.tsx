'use client'

import { openCookieSettings } from '@/lib/consent'

/**
 * Footer link that reopens the cookie bar. An <a> so it picks up each footer's
 * own link styles (CSS modules style `.footerLinks a`). Hidden when GTM isn't
 * configured, since there's no banner to reopen then.
 */
export default function CookieSettingsLink({ style, className }: { style?: React.CSSProperties; className?: string }) {
  if (!process.env.NEXT_PUBLIC_GTM_ID) return null
  return (
    <a
      href="#cookie-settings"
      role="button"
      style={style}
      className={className}
      onClick={e => {
        e.preventDefault()
        openCookieSettings()
      }}
    >
      Cookie settings
    </a>
  )
}

/** The "·" before the link, hidden together with it. */
export function CookieSettingsDot({ style }: { style?: React.CSSProperties }) {
  if (!process.env.NEXT_PUBLIC_GTM_ID) return null
  return <span style={style} aria-hidden>·</span>
}
