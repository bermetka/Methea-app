import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/ui/Logo'
import NewProjectForm from './NewProjectForm'
import { archiveProject } from './actions'
import { FREE_CAP_ERROR, FREE_CAP_MESSAGE } from '@/lib/project-cap'
import { getUserPriceVariant } from '@/lib/checkout'
import { priceForVariant } from '@/lib/pricing'
import type { Project } from '@/types/database'

export const metadata = { title: 'My projects — Methea' }

export default async function ProjectsPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, created_at, research_context')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const list = (projects ?? []) as Project[]
  const isFirstVisit = list.length === 0
  // The student's own price (same as checkout), only needed for the welcome copy.
  const price = isFirstVisit ? priceForVariant(await getUserPriceVariant(user.id)).label : null

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
                <div key={p.id} style={s.projectRow}>
                <a href={`/project/${p.id}`} style={s.projectCard}>
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
                <form action={archiveProject} style={s.archiveForm}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <button type="submit" style={s.archiveBtn}>Archive</button>
                </form>
                </div>
              )
            })}
          </div>
        )}

        {/* First visit: what Methea does, before the first project */}
        {isFirstVisit && (
          <section style={s.welcome}>
            <h3 style={s.welcomeTitle}>Welcome to Methea</h3>
            <p style={s.welcomeSub}>Your research methods navigator. It guides, you write.</p>
            <ol style={s.steps}>
              {WELCOME_STEPS.map(([lead, rest], i) => (
                <li key={lead} style={s.step}>
                  <span style={s.stepNum}>{i + 1}</span>
                  <span style={s.stepText}>
                    <strong style={s.stepLead}>{lead}</strong>
                    {rest && <span style={s.stepRest}> — {rest}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* New project form */}
        <div style={s.newSection}>
          {searchParams.error === FREE_CAP_ERROR && <p style={s.capError}>{FREE_CAP_MESSAGE}</p>}
          <p style={s.newLabel}>
            {list.length === 0 ? 'Start your first project' : 'Start a new project'}
          </p>
          <NewProjectForm />
          {isFirstVisit && (
            <>
              <p style={s.hint}>Just a working title. You&apos;ll describe your research on the next screen.</p>
              <p style={s.hint}>
                Steps 1–3 are free. Full framework, methodology and interview guide: {price} per project.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

const WELCOME_STEPS: [string, string | null][] = [
  ['Describe your topic', 'a sentence or two is enough'],
  ['Sharpen your research question', 'Methea asks, you answer'],
  ['Choose a theoretical lens', 'and see how it shapes your study'],
  ['Build your framework, method and interview guide', null],
]

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', background: 'var(--paper)', padding: '2.5rem 1rem 4rem' },
  container:   { maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header:      { display: 'flex', alignItems: 'center' },
  titleRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  heading:     { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.015em' },

  projectList: { display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--sheet)' },
  projectRow:  { display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--stone-soft)' },
  projectCard: {
    display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0,
    padding: '1rem 0 1rem 1.25rem',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  archiveForm: { padding: '0 1.25rem 0 0.75rem' },
  archiveBtn:  { background: 'none', border: 'none', padding: 0, fontSize: '0.75rem', fontFamily: 'inherit', color: 'var(--pencil)', cursor: 'pointer' },
  capError:    { fontSize: '0.875rem', color: 'var(--warn-text)', background: 'var(--marker-yellow)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)' },
  projectMain: { flex: 1, minWidth: 0 },
  projectTitle:{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  projectMeta: { fontSize: '0.8125rem', color: 'var(--pencil)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  projectRight:{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 },
  stepBadge:   { padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' as const },
  arrow:       { fontSize: '0.875rem', color: 'var(--pencil)' },

  newSection:  { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  newLabel:    { fontSize: '0.875rem', fontWeight: 600, color: 'var(--graphite)' },
  hint:        { fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--pencil)' },

  welcome:      { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  welcomeTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.375rem', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.015em', lineHeight: 1.25 },
  welcomeSub:   { fontSize: '0.9375rem', color: 'var(--pencil)', lineHeight: 1.5 },
  steps:        { listStyle: 'none', margin: '0.5rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' },
  step:         { display: 'flex', alignItems: 'flex-start', gap: '0.625rem' },
  stepNum:      { flexShrink: 0, width: '1.5rem', height: '1.5rem', borderRadius: '50%', border: '1px solid var(--stone-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--graphite)' },
  stepText:     { fontSize: '0.9375rem', lineHeight: 1.5, paddingTop: '1px' },
  stepLead:     { fontWeight: 600, color: 'var(--ink)' },
  stepRest:     { color: 'var(--pencil)' },
}
