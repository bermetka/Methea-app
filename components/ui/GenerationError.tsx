import Logo from './Logo'

interface Props {
  projectId: string
  // What Claude was generating, in plain language — e.g. "framework diagram",
  // "methodology recommendation", "interview guide".
  stepLabel: string
  // Path to retry — usually the current page's own URL, so a fresh request re-runs
  // the generation from scratch.
  retryHref: string
}

/**
 * Friendly fallback for when an AI generation step fails even after generateJSON's
 * built-in retry (see lib/claude.ts). Renders in place of a page's normal content so a
 * Claude hiccup never surfaces as Next's default crash page ("white screen") — the
 * student always has a retry and a way back to the project dashboard.
 */
export default function GenerationError({ projectId, stepLabel, retryHref }: Props) {
  return (
    <main style={s.page}>
      <div style={s.container}>
        <Logo size="sm" />
        <div style={s.card}>
          <p style={s.title}>We couldn&apos;t generate your {stepLabel} right now</p>
          <p style={s.body}>
            This sometimes happens with Claude&apos;s response — nothing was lost, and your
            project is unchanged. Give it another try, or come back in a moment.
          </p>
          <div style={s.actions}>
            <a href={retryHref} style={s.retryBtn}>Try again →</a>
            <a href={`/project/${projectId}`} style={s.backLink}>← Back to your project</a>
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
  retryBtn:  { padding: '0.625rem 1.25rem', background: 'var(--ink-blue)', color: 'var(--sheet)', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, textDecoration: 'none' },
  backLink:  { fontSize: '0.875rem', color: 'var(--ink-blue)', textDecoration: 'none', fontWeight: 500 },
}
