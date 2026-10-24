'use client'

import { useEffect } from 'react'
import Logo from '@/components/ui/Logo'

/**
 * Route-level error boundary: any uncaught error inside a page renders this
 * instead of Next's default crash screen. AI generation failures are handled
 * closer to the source (components/ui/GenerationError.tsx); this is the net
 * for everything else.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main style={s.page}>
      <div style={s.container}>
        <Logo size="sm" />
        <div style={s.card}>
          <p style={s.title}>Something went wrong</p>
          <p style={s.body}>
            Your work is saved — this page just hit a snag. Try again, or head back to your projects.
          </p>
          <div style={s.actions}>
            <button type="button" onClick={reset} style={s.retryBtn}>Try again →</button>
            <a href="/projects" style={s.backLink}>← Back to projects</a>
          </div>
        </div>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', padding: '3rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  card:      { padding: '1.5rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  title:     { fontSize: '1.0625rem', fontWeight: 600, color: 'var(--ink)' },
  body:      { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.6 },
  actions:   { display: 'flex', gap: '1.25rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' as const },
  retryBtn:  { padding: '0.625rem 1.25rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  backLink:  { fontSize: '0.875rem', color: 'var(--ink-blue)', textDecoration: 'none', fontWeight: 500 },
}
