'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so the layout's stylesheet and fonts may not be loaded —
 * colours are the brand hex values, not CSS variables.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={s.body}>
        <main style={s.container}>
          <p style={s.wordmark}>Methea</p>
          <div style={s.card}>
            <p style={s.title}>Something went wrong</p>
            <p style={s.text}>
              Your work is saved — Methea just hit a snag. Try again, or head back to your projects.
            </p>
            <div style={s.actions}>
              <button type="button" onClick={reset} style={s.retryBtn}>Try again →</button>
              <a href="/projects" style={s.backLink}>← Back to projects</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}

const s: Record<string, React.CSSProperties> = {
  body:      { margin: 0, minHeight: '100vh', background: '#F6F2E8', fontFamily: "'Schibsted Grotesk', system-ui, sans-serif", color: '#1C1C1C' },
  container: { maxWidth: '720px', margin: '0 auto', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  wordmark:  { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.045em', margin: 0 },
  card:      { padding: '1.5rem', background: '#FBF9F3', border: '1px solid #E4DED0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  title:     { fontSize: '1.0625rem', fontWeight: 600, margin: 0 },
  text:      { fontSize: '0.9375rem', color: '#4A4A47', lineHeight: 1.6, margin: 0 },
  actions:   { display: 'flex', gap: '1.25rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' },
  retryBtn:  { padding: '0.625rem 1.25rem', background: '#11425D', color: '#FBF9F3', border: 'none', borderRadius: '8px', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  backLink:  { fontSize: '0.875rem', color: '#11425D', textDecoration: 'none', fontWeight: 500 },
}
