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
export default function TopicForm({ id, dark = false }: { id: string; dark?: boolean }) {
  const [topic, setTopic] = useState('')

  function handOver() {
    const value = encodeURIComponent(JSON.stringify({ q: topic.trim().slice(0, CHECK_QUESTION_MAX), path: 'program', stage: 'who' }))
    const secure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `${CHECK_COOKIE}=${value}; path=/; max-age=${7 * 24 * 3600}; samesite=lax${secure}`
    void trackCheck('check_cta', { path: 'program', stage: 'who' })
  }

  return (
    <form
      action="/check/start"
      method="get"
      onSubmit={handOver}
      className={dark ? styles.formDark : styles.form}
    >
      <label htmlFor={id} className={styles.formLabel}>Your research topic</label>
      <textarea
        id={id}
        value={topic}
        onChange={e => setTopic(e.target.value)}
        maxLength={CHECK_QUESTION_MAX}
        rows={3}
        placeholder="e.g. How remote work affects the wellbeing of IT specialists in Bishkek"
        className={styles.textarea}
      />
      <button type="submit" className={dark ? styles.btnLime : styles.btn}>Check my topic — free →</button>
      <span className={styles.formHint}>One sentence is enough · no card needed</span>
    </form>
  )
}
