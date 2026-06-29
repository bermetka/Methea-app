import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import Gate1Form from './Gate1Form'
import type { Project } from '@/types/database'

export const metadata = { title: 'Sharpening your research question — Methea' }

export default async function Gate1Page({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const p = project as Project
  const ctx = p.research_context

  // Guard: must have a brief before gate1
  if (!ctx?.brief) redirect(`/project/${params.id}/brief`)

  const gate1 = ctx?.socratic_gate_1
  const questions = gate1?.questions ?? []

  // Edge case: questions weren't generated — send back to brief
  if (questions.length === 0) redirect(`/project/${params.id}/brief`)

  // Read-only view when gate1 is already completed
  if (gate1?.completed) {
    const responses = gate1.responses ?? {}
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Logo size="sm" />
          <div style={styles.reviewCard}>
            <p style={styles.reviewHeading}>Research question refined</p>
            <p style={styles.reviewSub}>Your answers to these questions shaped your final research question.</p>
            <div style={styles.divider} />
            {questions.map(q => (
              <div key={q.id} style={styles.qaRow}>
                <p style={styles.qText}>{q.prompt}</p>
                <p style={styles.aText}>
                  {q.options.find(o => o.value === responses[q.id])?.title ?? responses[q.id] ?? '—'}
                </p>
              </div>
            ))}
          </div>
          <div style={styles.backRow}>
            <a href={`/project/${params.id}`} style={styles.backLink}>← Back to project</a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
        <Gate1Form
          projectId={params.id}
          questions={questions}
          brief={ctx.brief}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:          { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--paper)' },
  container:     { width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  reviewCard:    { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  reviewHeading: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.125rem', fontWeight: 400, color: 'var(--ink)' },
  reviewSub:     { fontSize: '0.875rem', color: 'var(--pencil)', marginTop: '-0.5rem' },
  divider:       { borderTop: '1px solid var(--stone-soft)' },
  qaRow:         { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem' },
  qText:         { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--pencil)' },
  aText:         { fontSize: '0.9375rem', color: 'var(--ink)' },
  backRow:       { display: 'flex' },
  backLink:      { fontSize: '0.875rem', color: 'var(--ink-blue)', textDecoration: 'none', fontWeight: 500 },
}
