import Logo from '@/components/ui/Logo'
import UnlockButton from './UnlockButton'

interface Props {
  projectId: string
  title: string
  description: string
}

export default function PaywallLock({ projectId, title, description }: Props) {
  return (
    <main style={s.page}>
      <div style={s.container}>
        <Logo size="sm" />
        <div style={s.card}>
          <p style={s.eyebrow}>Unlock this project</p>
          <h1 style={s.heading}>{title}</h1>
          <p style={s.description}>{description}</p>
          <UnlockButton projectId={projectId} />
          <a href={`/project/${projectId}`} style={s.backLink}>← Back to project</a>
        </div>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', padding: '3rem 1rem', background: 'var(--paper)' },
  container:   { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' },
  card:        { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' },
  eyebrow:     { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pencil)' },
  heading:     { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.02em' },
  description: { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.65 },
  backLink:    { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none', marginTop: '0.5rem' },
}
