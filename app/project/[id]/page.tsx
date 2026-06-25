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

  const brief     = p.research_context.brief!
  const ctx       = p.research_context
  const selectedIds = ctx.theories!.selected_ids

  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year')
    .in('id', selectedIds)

  const selectedTheories = (theories ?? []) as Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]

  const frameworkDone     = !!ctx.framework?.edges?.length
  const frameworkOutdated = false // Sprint 4: wire up soft-invalidation

  // Determine "Next" step
  const nextStep = !frameworkDone
    ? { label: 'Build your framework', href: `/project/${params.id}/framework`, cta: 'Build framework →' }
    : { label: 'Derive your methodology', href: `/project/${params.id}/methodology`, cta: 'Start methodology →' }

  // Truncate question for preview
  const questionPreview = brief.research_question.length > 60
    ? brief.research_question.slice(0, 58) + '…'
    : brief.research_question

  return (
    <main style={s.page}>
      <div style={s.container}>
        {/* Header row */}
        <div style={s.headerRow}>
          <Logo size="sm" />
          <span style={s.projectName}>My Project ▾</span>
        </div>

        {/* Dark "Next" banner */}
        <div style={s.banner}>
          <div style={{ flex: 1 }}>
            <p style={s.bannerLabel}>Next</p>
            <p style={s.bannerText}>{nextStep.label}</p>
          </div>
          <a href={nextStep.href} style={s.bannerBtn}>{nextStep.cta}</a>
        </div>

        {/* Plan section */}
        <div>
          <p style={s.sectionLabel}>Plan</p>
          <div style={s.statusList}>
            {/* Research question */}
            <div style={s.statusRow}>
              <span style={{ ...s.ico, ...s.icoOk }}>✓</span>
              <div style={s.statusBody}>
                <p style={s.statusTitle}>Research question</p>
                <p style={s.statusMeta}>&ldquo;{questionPreview}&rdquo;</p>
              </div>
              <a href={`/project/${params.id}/brief`} style={s.quietBtn}>Open →</a>
            </div>

            {/* Theories */}
            <div style={s.statusRow}>
              <span style={{ ...s.ico, ...s.icoOk }}>✓</span>
              <div style={s.statusBody}>
                <p style={s.statusTitle}>Theories</p>
                <p style={s.statusMeta}>
                  {selectedTheories.map(t => t.name).join(' · ')}
                </p>
              </div>
              <a href={`/project/${params.id}/theories`} style={s.quietBtn}>Open →</a>
            </div>

            {/* Framework */}
            <div style={{
              ...s.statusRow,
              ...(frameworkOutdated ? s.statusRowOutdated : {}),
            }}>
              <span style={{ ...s.ico, ...(frameworkOutdated ? s.icoWarn : s.icoOk) }}>
                {frameworkOutdated ? '⚠' : '✓'}
              </span>
              <div style={s.statusBody}>
                <p style={s.statusTitle}>
                  Framework
                  {frameworkOutdated && <span style={s.versionBadge}> · outdated</span>}
                </p>
                <p style={s.statusMeta}>
                  {ctx.framework?.edges?.length
                    ? `${selectedTheories.length} theories mapped`
                    : 'Not started'}
                </p>
              </div>
              <a href={`/project/${params.id}/framework`} style={s.quietBtn}>
                {frameworkOutdated ? 'Review →' : 'Open →'}
              </a>
            </div>

            {/* Methodology — locked */}
            <div style={{ ...s.statusRow, opacity: 0.6 }}>
              <span style={{ ...s.ico, ...s.icoEmpty }}>○</span>
              <div style={s.statusBody}>
                <p style={s.statusTitle}>Methodology</p>
                <p style={s.statusMeta}>Not started — needs framework first</p>
              </div>
              <span style={s.lockLabel}>🔒 Locked</span>
            </div>
          </div>
        </div>

        {/* Collect section */}
        <div>
          <p style={s.sectionLabel}>Collect</p>
          <div style={s.statusList}>
            <div style={{ ...s.statusRow, opacity: 0.5 }}>
              <span style={{ ...s.ico, ...s.icoEmpty }}>🔒</span>
              <div style={s.statusBody}>
                <p style={s.statusTitle}>Interview guide</p>
                <p style={s.statusMeta}>Available in v1.1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analyse section */}
        <div>
          <p style={s.sectionLabel}>Analyse</p>
          <div style={s.statusList}>
            <div style={{ ...s.statusRow, opacity: 0.5 }}>
              <span style={{ ...s.ico, ...s.icoEmpty }}>🔒</span>
              <div style={s.statusBody}>
                <p style={s.statusTitle}>Findings</p>
                <p style={s.statusMeta}>Available in v2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', padding: '2.5rem 1rem', background: 'var(--paper)' },
  container:   { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },

  // Header
  headerRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  projectName: { fontSize: '0.8125rem', fontWeight: 500, color: 'var(--graphite)', cursor: 'pointer' },

  // Banner
  banner:      { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', background: 'var(--ink)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' as const },
  bannerLabel: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(251,249,243,0.6)', marginBottom: '0.25rem' },
  bannerText:  { fontSize: '0.9375rem', color: 'var(--sheet)', lineHeight: 1.4 },
  bannerBtn:   { flexShrink: 0, padding: '0.625rem 1.125rem', background: 'var(--marker-lime)', color: 'var(--ink)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap' as const },

  // Section
  sectionLabel:{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pencil)', marginBottom: '0.5rem' },
  statusList:  { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  statusRow:   { display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.125rem', borderBottom: '1px solid var(--stone-soft)' },
  statusRowOutdated: { background: 'rgba(255,230,109,0.08)' },

  // Status icons
  ico:         { flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700 },
  icoOk:       { background: 'var(--mint)', color: 'var(--moss)' },
  icoWarn:     { background: 'var(--marker-yellow)', color: 'var(--warn-text)' },
  icoEmpty:    { background: 'var(--paper-deep)', color: 'var(--pencil)', border: '1.5px solid var(--stone)', fontSize: '0.75rem' },

  // Status body
  statusBody:  { flex: 1, minWidth: 0 },
  statusTitle: { fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' },
  statusMeta:  { fontSize: '0.75rem', color: 'var(--pencil)', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  versionBadge:{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--warn-text)' },

  // Actions
  quietBtn:    { flexShrink: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none', padding: '0.25rem 0' },
  lockLabel:   { flexShrink: 0, fontSize: '0.75rem', color: 'var(--pencil)' },
}
