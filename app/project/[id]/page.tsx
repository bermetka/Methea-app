import { notFound, redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import type { Project, Theory } from '@/types/database'

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
  if (!p.research_context?.theories?.selected_ids?.length) {
    redirect(`/project/${params.id}/theories`)
  }
  if (!p.research_context?.framework?.edges?.length) {
    redirect(`/project/${params.id}/framework`)
  }

  const brief = p.research_context.brief!
  const selectedIds = p.research_context.theories!.selected_ids

  // Fetch selected theories for display
  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year, concepts')
    .in('id', selectedIds)

  const selectedTheories = (theories ?? []) as Pick<Theory, 'id' | 'name' | 'author' | 'year' | 'concepts'>[]

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />

        {/* Research question */}
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

        {/* Selected theories */}
        <div style={styles.card}>
          <div style={styles.cardLabelRow}>
            <p style={styles.cardLabel}>Theoretical framework</p>
            <span style={styles.doneChip}>✓ {selectedTheories.length} theories selected</span>
          </div>
          <div style={styles.theoryList}>
            {selectedTheories.map(t => (
              <div key={t.id} style={styles.theoryRow}>
                <div style={styles.theoryInfo}>
                  <span style={styles.theoryName}>{t.name}</span>
                  <span style={styles.theoryMeta}>{t.author}{t.year ? `, ${t.year}` : ''}</span>
                </div>
                <div style={styles.conceptTags}>
                  {t.concepts.slice(0, 2).map(c => (
                    <span key={c} style={styles.conceptTag}>{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
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

        {/* Up next */}
        <div style={styles.nextCard}>
          <p style={styles.nextLabel}>Up next — Sprint 4</p>
          <p style={styles.nextText}>Methodology chain: derive your paradigm, methodology, data collection approach, and analysis method from your framework.</p>
        </div>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:          { minHeight: '100vh', padding: '3rem 1rem', background: 'var(--paper)' },
  container:     { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  wordmark:      { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--ink)' },
  card:          { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardLabel:     { fontSize: '0.75rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  cardLabelRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  doneChip:      { fontSize: '0.75rem', fontWeight: 600, color: 'var(--moss)', background: 'var(--mint)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' },
  question:      { fontSize: '1.375rem', color: 'var(--ink)', lineHeight: 1.35 },
  meta:          { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const },
  tag:           { display: 'inline-block', padding: '3px 10px', background: 'var(--paper-deep)', color: 'var(--graphite)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 500 },
  theoryList:    { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  theoryRow:     { display: 'flex', flexDirection: 'column', gap: '0.375rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--stone-soft)' },
  theoryInfo:    { display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' as const },
  theoryName:    { fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)' },
  theoryMeta:    { fontSize: '0.8125rem', color: 'var(--pencil)' },
  conceptTags:   { display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const },
  conceptTag:    { padding: '2px 8px', background: 'var(--paper-deep)', color: 'var(--graphite)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' },
  list:          { paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  listItem:      { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.5 },
  nextCard:      { padding: '1rem 1.25rem', background: 'var(--paper-deep)', border: '1px dashed var(--stone)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  nextLabel:     { fontSize: '0.75rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  nextText:      { fontSize: '0.9375rem', color: 'var(--graphite)' },
}
