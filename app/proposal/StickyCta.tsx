'use client'

import { useEffect, useState } from 'react'
import styles from './proposal.module.css'

/** Bottom bar: shows only while neither topic form is on screen. */
export default function StickyCta({ target, watch }: { target: string; watch: string[] }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const els = watch.map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    if (!els.length) return
    const visible = new Set<Element>()
    const io = new IntersectionObserver(entries => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)
      setShow(visible.size === 0)
    })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [watch])

  return (
    <div className={`${styles.sticky} ${show ? styles.stickyOn : ''}`} aria-hidden={!show}>
      <div className={styles.stickyInner}>
        <span className={styles.stickyText}>Proposal due?</span>
        <a href={`#${target}`} tabIndex={show ? 0 : -1} className={styles.stickyBtn}>Check your topic free →</a>
      </div>
    </div>
  )
}
