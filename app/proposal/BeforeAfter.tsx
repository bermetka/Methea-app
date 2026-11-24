'use client'

import { useEffect, useState } from 'react'
import styles from './proposal.module.css'

/**
 * Real Gate 1 results (methea.app guest runs, 2026-11-24): the topic as typed,
 * and the question Methea sharpened it into after three quick answers. Shown in
 * the same red/green cards as the "question refined" screen, so the ad, this page
 * and the product look the same. Do not edit the text: replace a pair only with
 * another real run.
 */
const PAIRS = [
  {
    before: 'social media and body image',
    after: 'To what extent does daily social media usage pattern predict body image dissatisfaction among undergraduate students at a single university?',
  },
  {
    before: 'why people buy small luxuries in a crisis',
    after: 'What motivates female millennial consumers in online luxury communities to purchase small luxury items during periods of personal financial hardship?',
  },
  {
    before: 'AI tools and how students study',
    after: 'Why do master’s students at your institution change their study habits when using ChatGPT, and how do they experience those changes?',
  },
]

const ROTATE_MS = 6000

export default function BeforeAfter() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI(n => (n + 1) % PAIRS.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [paused])

  const pair = PAIRS[i]
  return (
    <figure
      className={styles.ba}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Example: a broad topic and the research question Methea sharpened it into"
    >
      <div className={styles.baBefore}>
        <p className={styles.baBeforeLabel}>Before · too broad to research</p>
        <p className={styles.baBeforeText}>{pair.before}</p>
      </div>
      <span className={styles.baArrow} aria-hidden="true">↓ 3 quick questions</span>
      <div className={styles.baAfter} aria-live="polite">
        <p className={styles.baAfterLabel}>After · ready for theories</p>
        <p className={styles.baAfterText}>{pair.after}</p>
      </div>
      <div className={styles.baDots}>
        {PAIRS.map((p, n) => (
          <button
            key={p.before}
            type="button"
            className={n === i ? styles.baDotOn : styles.baDot}
            onClick={() => { setI(n); setPaused(true) }}
            aria-label={`Example ${n + 1}: ${p.before}`}
            aria-pressed={n === i}
          />
        ))}
      </div>
      <figcaption className={styles.caption}>Real results from Methea. You answer three questions; you approve the wording.</figcaption>
    </figure>
  )
}
