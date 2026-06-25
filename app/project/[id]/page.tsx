import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types/database'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'Project — Methea' }
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  const p = project as Project

  // Route to active step
  if (!p.research_context?.brief) {
    redirect(`/project/${params.id}/brief`)
  }
  if (!p.research_context?.socratic_gate_1?.completed) {
    redirect(`/project/${params.id}/gate1`)
  }

  const brief = p.research_context.brief!

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <span style={styles.wordmark}>Methea</span>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Your research question</p>
          <h2 style={styles.question}>{brief.research_question}</h2>
          <div style={styles.meta}>
            <span style={styles.tag}>{brief.degree_level}</span>
            <span style={styles.tag}>{brief.discipline}</span>
            <span style={{ ...styles.tag, background: 'var(--sky)', color: 'var(--ink-blue)' }}>
              {brief.research_type}
            </span>
          </div>
        </div>

        {brief.constraints.length > 0 && (
          <div style={styles.card}>
            <p style={styles.cardLabel}>Constraints identified</p>
            <ul style={styles.list}>
              {brief.constraints.map((c, i) => (
                <li key={i} style={styles.listItem}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={styles.nextCard}>
          <p style={styles.nextLabel}>Up next — Sprint 2</p>
          <p style={styles.nextText}>Theory discovery: Claude will suggest relevant theories from the library based on your research question.</p>
        </div>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', padding: '3rem 1rem' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  wordmark:  { fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--ink)' },
  card:      { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardLabel: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  question:  { fontSize: '1.375rem', color: 'var(--ink)', lineHeight: 1.35 },
  meta:      { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const },
  tag:       { display: 'inline-block', padding: '3px 10px', background: 'var(--paper-deep)', color: 'var(--graphite)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 500 },
  list:      { paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  listItem:  { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.5 },
  nextCard:  { padding: '1rem 1.25rem', background: 'var(--paper-deep)', border: '1px dashed var(--stone)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  nextLabel: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  nextText:  { fontSize: '0.9375rem', color: 'var(--graphite)' },
}
