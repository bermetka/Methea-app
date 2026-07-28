import Logo from '@/components/ui/Logo'

interface Props {
  title: string
  lastUpdated: string
  draft?: boolean
  children: React.ReactNode
}

export default function LegalLayout({ title, lastUpdated, draft, children }: Props) {
  return (
    <div style={s.root}>
      <nav style={s.nav}>
        <a href="/" style={s.navLink} aria-label="Back to Methea home">
          <Logo size="sm" />
        </a>
      </nav>

      <main style={s.main}>
        <h1 style={s.h1}>{title}</h1>
        <p style={s.updated}>Last updated: {lastUpdated}</p>
        {draft && (
          <p style={s.draftNote}>
            This page is a draft pending legal review. Do not rely on it as final until this note is removed.
          </p>
        )}
        <div style={s.prose}>{children}</div>
      </main>

      <footer style={s.footer}>
        <a href="/" style={s.footerLink}>← Back to Methea</a>
        <span style={s.footerDot}>·</span>
        <a href="/privacy" style={s.footerLink}>Privacy</a>
        <span style={s.footerDot}>·</span>
        <a href="/terms" style={s.footerLink}>Terms</a>
        <span style={s.footerDot}>·</span>
        <a href="mailto:privacy@methea.app" style={s.footerLink}>privacy@methea.app</a>
      </footer>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' },

  nav: { padding: '1.5rem', borderBottom: '1px solid var(--stone-soft)' },
  navLink: { display: 'inline-block' },

  main: { flex: 1, maxWidth: 'var(--max-width)', width: '100%', margin: '0 auto', padding: '3rem 1.5rem 4rem' },

  h1: { fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.5rem' },
  updated: { fontSize: '0.8125rem', color: 'var(--pencil)' },
  draftNote: {
    fontSize: '0.8125rem',
    color: 'var(--warn-text)',
    fontStyle: 'italic',
    marginTop: '0.75rem',
    padding: '0.625rem 0.875rem',
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
  },

  prose: { display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2.5rem' },

  footer: {
    borderTop: '1px solid var(--stone-soft)',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.625rem',
    flexWrap: 'wrap',
  },
  footerLink: { fontSize: '0.8125rem', color: 'var(--graphite)' },
  footerDot: { fontSize: '0.8125rem', color: 'var(--stone)' },
}

// Shared text styles for legal-page body content — imported by /privacy and /terms
export const prose: Record<string, React.CSSProperties> = {
  h2: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.75rem' },
  p: { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.7 },
  section: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.25rem' },
  listItem: { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.65, display: 'flex', gap: '0.5rem' },
  dot: { flexShrink: 0, color: 'var(--pencil)' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.875rem' },
  th: { textAlign: 'left' as const, padding: '0.5rem 0.75rem', borderBottom: '2px solid var(--stone)', color: 'var(--ink)', fontWeight: 600 },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--stone-soft)', color: 'var(--graphite)', verticalAlign: 'top' as const },
  strong: { color: 'var(--ink)', fontWeight: 600 },
}
