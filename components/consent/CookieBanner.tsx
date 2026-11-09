'use client'

import { useEffect, useState } from 'react'
import { COOKIE_SETTINGS_EVENT, readConsent, saveConsent, type ConsentChoice } from '@/lib/consent'
import styles from './CookieBanner.module.css'

/**
 * Compact bottom bar until the visitor chooses. Fixed-position, so showing it
 * never shifts the page; while it's up, body gets bottom padding the bar's
 * height so the last CTA on a page can still scroll clear of it.
 */
export default function CookieBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!readConsent()) setOpen(true)
    // Footer "Cookie settings" reopens the bar to change an earlier choice.
    const reopen = () => setOpen(true)
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen)
  }, [])

  useEffect(() => {
    document.body.classList.toggle(styles.reserve, open)
    return () => document.body.classList.remove(styles.reserve)
  }, [open])

  if (!open) return null

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice)
    setOpen(false)
  }

  return (
    <div className={styles.bar} role="region" aria-label="Cookie consent">
      <p className={styles.text}>
        We&rsquo;d like to use cookies to measure our ads and site visits. Only if you accept.{' '}
        <a href="/privacy" className={styles.link}>Privacy</a>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.reject} onClick={() => choose('denied')}>Reject</button>
        <button type="button" className={styles.accept} onClick={() => choose('granted')}>Accept</button>
      </div>
    </div>
  )
}
