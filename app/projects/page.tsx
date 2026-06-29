import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/ui/Logo'
import NewProjectForm from './NewProjectForm'
import type { Project } from '@/types/database'

export const metadata = { title: 'My projects — Methea' }

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, created_at, research_context')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const list = (projects ?? []) as Project[]

  return (
    <main style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <Logo size="sm" />
        </div>

        <div style={s.titleRow}>
          <h2 style={s.heading}>My projects</h2>
        </div>

        {/* Project list */}
        {list.length > 0 && (
          <div style={s.projectList}>
            {list.map(p => {
              const ctx = p.research_context
              const step = !ctx?.brief
                ? 'Brief'
                : !ctx?.socratic_gate_1?.completed
                ? 'Gate 1'
                : !ctx?.theories?.selected_ids?.length
                ? 'Theories'
                : !ctx?.framework?.edges?.length
                ? 'Framework'
                : !ctx?.methodology?.narrative
                ? 'Methodology'
                : !ctx?.interview_guide?.questions?.length
                ? 'Interview guide'
                : 'Complete'

              const isComplete = step === 'Complete'

              return (
                <a key={p.id} href={`/project/${p.id}`} style={s.projectCard}>
                  <div style={s.projectMain}>
                    <p style={s.projectTitle}>{p.title || 'Untitled project'}</p>
                    <p style={s.projectMeta}>
                      {ctx?.brief?.topic
                        ? ctx.brief.topic
                        : 'Brief not started yet'}
                    </p>
                  </div>
                  <div style={s.projectRight}>
                    <span style={{
                      ...s.stepBadge,
                      background: isComplete ? 'var(--mint)' : 'var(--paper-deep)',
                      color: isComplete ? 'var(--moss)' : 'var(--pencil)',
                    }}>
                      {isComplete ? '✓ Complete' : `In progress · ${step}`}
                    </span>
                    <span style={s.arrow}>→</span>
                  </div>
                </a>
              )
            })}
          </div>
        )}

        {/* New project form */}
        <div style={s.newSection}>
          <p style={s.newLabel}>
            {list.length === 0 ? 'Start your first project' : 'Start a new project'}
          </p>
          <NewProjectForm />
        </div>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', background: 'var(--paper)', padding: '2.5rem 1rem 4rem' },
  container:   { maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header:      { display: 'flex', alignItems: 'center' },
  titleRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  heading:     { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.015em' },

  projectList: { display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--sheet)' },
  projectCard: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--stone-soft)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  projectMain: { flex: 1, minWidth: 0 },
  projectTitle:{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  projectMeta: { fontSize: '0.8125rem', color: 'var(--pencil)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  projectRight:{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 },
  stepBadge:   { padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' as const },
  arrow:       { fontSize: '0.875rem', color: 'var(--pencil)' },

  newSection:  { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  newLabel:    { fontSize: '0.875rem', fontWeight: 600, color: 'var(--graphite)' },
}
