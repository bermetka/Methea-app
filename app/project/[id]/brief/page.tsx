import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import BriefForm from './BriefForm'
import type { Project } from '@/types/database'

export const metadata = { title: "Tell me what you're researching — Methea" }

export default async function BriefPage({ params }: { params: { id: string } }) {
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
  const brief = p.research_context?.brief

  // Brief submitted but gate1 not done → go to gate1
  if (brief && !p.research_context?.socratic_gate_1?.completed) {
    redirect(`/project/${params.id}/gate1`)
  }

  // Read-only view when brief is already done
  if (brief) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <Logo size="sm" />
            <h2 style={styles.heading}>Your research brief</h2>
          </div>
          <div style={styles.reviewCard}>
            <p style={styles.reviewLabel}>Topic</p>
            <p style={styles.reviewText}>{brief.topic}</p>
            <div style={styles.divider} />
            <p style={styles.reviewLabel}>Research question</p>
            <p style={styles.reviewText}>{brief.research_question}</p>
            <div style={styles.divider} />
            <div style={styles.metaRow}>
              <div>
                <p style={styles.reviewLabel}>Degree</p>
                <p style={styles.reviewMeta}>{brief.degree_level}</p>
              </div>
              <div>
                <p style={styles.reviewLabel}>Discipline</p>
                <p style={styles.reviewMeta}>{brief.discipline}</p>
              </div>
            </div>
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
        <div style={styles.header}>
          <Logo size="sm" />
          <h2 style={styles.heading}>Tell me what you&apos;re researching</h2>
          <p style={styles.sub}>A sentence or two is enough to start.</p>
        </div>
        <BriefForm projectId={params.id} />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--paper)' },
  container:   { width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header:      { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' },
  heading:     { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 400, letterSpacing: '-0.015em', color: 'var(--ink)', lineHeight: 1.2 },
  sub:         { fontSize: '0.9375rem', color: 'var(--pencil)' },
  reviewCard:  { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  reviewLabel: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pencil)', marginBottom: '0.25rem' },
  reviewText:  { fontSize: '0.9375rem', color: 'var(--ink)', lineHeight: 1.6 },
  reviewMeta:  { fontSize: '0.9375rem', color: 'var(--graphite)' },
  divider:     { borderTop: '1px solid var(--stone-soft)' },
  metaRow:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  backRow:     { display: 'flex', justifyContent: 'flex-start' },
  backLink:    { fontSize: '0.875rem', color: 'var(--ink-blue)', textDecoration: 'none', fontWeight: 500 },
}
