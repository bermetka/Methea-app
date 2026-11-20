'use client'

import { useEffect } from 'react'
import { trackLandingEngage } from '@/app/actions/funnel'

/**
 * How far a /proposal visitor got: scrolled halfway, a topic form came into view,
 * started typing a topic. Each step is sent once per page view (and once per
 * visitor on the server).
 */
export default function EngageTracker({ forms }: { forms: string[] }) {
  useEffect(() => {
    const sent = new Set<string>()
    const send = (step: 'scroll_50' | 'form_seen' | 'topic_focus') => {
      if (sent.has(step)) return
      sent.add(step)
      void trackLandingEngage(step)
    }

    const onScroll = () => {
      const doc = document.documentElement
      if (window.scrollY + window.innerHeight >= doc.scrollHeight * 0.5) send('scroll_50')
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // The hero form is on screen at load on desktop; count it only once they've looked at it.
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.6)) send('form_seen')
    }, { threshold: 0.6 })
    forms.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el) })

    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement && forms.some(id => (e.target as HTMLElement).closest(`#${id}`))) send('topic_focus')
    }
    document.addEventListener('focusin', onFocus)

    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
      document.removeEventListener('focusin', onFocus)
    }
  }, [forms])
  return null
}
