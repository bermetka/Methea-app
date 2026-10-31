import PendingSteps from './PendingSteps'

/**
 * Shown the moment a step page starts loading, while the server waits on
 * Claude. Without it the click looks like it did nothing — students leave.
 */
export default function StepLoading({ title, steps }: { title: string; steps: string[] }) {
  return (
    <main style={s.page}>
      <div style={s.container} role="status">
        <div style={s.spinner} aria-hidden="true" data-methea-spinner="" />
        <h2 style={s.title}>{title}</h2>
        <p style={s.step}><PendingSteps steps={steps} /></p>
        <p style={s.hint}>This usually takes 15–30 seconds. You can stay on this page.</p>
      </div>
      <style>{`@keyframes methea-spin { to { transform: rotate(360deg) } }
@media (prefers-reduced-motion: reduce) { [data-methea-spinner] { animation: none !important } }`}</style>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:      { minHeight: '70vh', padding: '4rem 1rem', background: 'var(--paper)' },
  container: { maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' },
  spinner:   { width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--stone)', borderTopColor: 'var(--ink-blue)', animation: 'methea-spin 0.9s linear infinite' },
  title:     { margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.015em' },
  step:      { margin: 0, fontSize: '0.9375rem', color: 'var(--graphite)', minHeight: '1.5em' },
  hint:      { margin: 0, fontSize: '0.8125rem', color: 'var(--pencil)' },
}
