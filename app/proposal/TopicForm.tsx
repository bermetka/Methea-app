'use client'

import { useState } from 'react'
import { trackCheck } from '@/app/actions/funnel'
import { CHECK_COOKIE, CHECK_QUESTION_MAX } from '@/lib/check'
import styles from './proposal.module.css'

/**
 * "Check my topic": hands the topic over the same way /check does — a cookie
 * read by /check/start and the auth callback — so after sign-in they land on a
 * new project's brief (Gate 1), pre-filled with what they typed.
 */
export default function TopicForm({
  id,
  dark = false,
  label = 'Your research topic',
  placeholder = 'e.g. How remote work affects the wellbeing of IT specialists in Bishkek',
  button = 'Check my topic — free →',
  hint = 'One sentence is enough · no card needed',
}: { id: string; dark?: boolean; label?: string; placeholder?: string; button?: string; hint?: string }) {
  const [topic, setTopic] = useState('')

  // Record the click before leaving the page: a fire-and-forget call can be cut
  // off by the navigation. Never wait more than a moment for it.
  async function handOver(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = encodeURIComponent(JSON.stringify({ q: topic.trim().slice(0, CHECK_QUESTION_MAX), path: 'program', stage: 'who' }))
    const secure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `${CHECK_COOKIE}=${value}; path=/; max-age=${7 * 24 * 3600}; samesite=lax${secure}`
    await Promise.race([
      trackCheck('check_cta', { path: 'program', stage: 'who' }).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 800)),
    ])
    window.location.assign('/check/start')
  }

  return (
    <form
      action="/check/start"
      method="get"
      onSubmit={handOver}
      id={`${id}-form`}
      className={dark ? styles.formDark : styles.form}
    >
      <label htmlFor={id} className={styles.formLabel}>{label}</label>
      <textarea
        id={id}
        value={topic}
        onChange={e => setTopic(e.target.value)}
        maxLength={CHECK_QUESTION_MAX}
        rows={3}
        required
        minLength={3}
        placeholder={placeholder}
        className={styles.textarea}
      />
      <button type="submit" className={dark ? styles.btnLime : styles.btn}>{button}</button>
      <span className={styles.formHint}>{hint}</span>
    </form>
  )
}
