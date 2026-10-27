import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import GenerationError from '@/components/ui/GenerationError'
import { createClient } from '@/lib/supabase/server'
import { generateInterviewGuide } from '@/lib/prompts/interview'
import { resolveProjectTheories } from '@/lib/project-theories'
import { isUnlimitedUser } from '@/lib/access'
import { hasFullAccess } from '@/lib/entitlement'
import { getUnlockInfo } from '@/lib/checkout'
import PaywallLock from '@/components/paywall/PaywallLock'
import ViewOnlyNotice from '@/components/paywall/ViewOnlyNotice'
import InterviewGuideView from './InterviewGuide'
import EthicsCheckpoint from './EthicsCheckpoint'
import type { Project, InterviewQuestion } from '@/types/database'

export const metadata = { title: 'Interview guide — Methea' }

export default async function InterviewGuidePage({ params }: { params: { id: string } }) {
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

  // Guard: must have methodology before interview guide
  if (!ctx?.methodology?.narrative) redirect(`/project/${params.id}/methodology`)

  // Paid-only step — checked before the ethics checkpoint so unpaid users
  // don't see a checkpoint for a feature they can't use yet. Already generated
  // questions stay viewable, read-only.
  if (!hasFullAccess(p, { unlimited: await isUnlimitedUser(supabase, user.id) })) {
    const unlock = await getUnlockInfo(p, user)
    const saved = ctx.interview_guide?.questions ?? []
    if (!saved.length) {
      return (
        <PaywallLock
          projectId={params.id}
          title="Your interview guide is ready to build"
          description="Unlock this project to generate 10-15 interview questions, each tagged to a framework concept, plus transcript analysis."
          unlock={unlock}
        />
      )
    }
    const theories = await resolveProjectTheories(ctx, ctx.theories?.selected_ids ?? [], supabase)
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Logo size="sm" />
          <ViewOnlyNotice
            projectId={params.id}
            unlock={unlock}
            outdated={(ctx.outdated_blocks ?? []).includes('interview_guide')}
          />
          <h2 style={styles.heading}>Your interview guide</h2>
          <InterviewGuideView
            projectId={params.id}
            questions={saved}
            theories={theories.map(t => ({ id: t.id, name: t.name }))}
            readOnly
          />
        </div>
      </main>
    )
  }

  // Ethics checkpoint — must confirm before generating guide
  if (!ctx.ethics_confirmed) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Logo size="sm" />
          <EthicsCheckpoint projectId={params.id} />
        </div>
      </main>
    )
  }

  const selectedTheories = await resolveProjectTheories(ctx, ctx.theories!.selected_ids, supabase)

  // Soft-invalidation: regenerate when marked ⚠ outdated by an upstream change, otherwise
  // reuse the saved questions. Saving clears the flag (interview-guide/actions.ts).
  const isOutdated = (ctx.outdated_blocks ?? []).includes('interview_guide')
  let questions: InterviewQuestion[]
  if (!isOutdated && ctx.interview_guide?.questions?.length) {
    questions = ctx.interview_guide.questions
  } else {
    try {
      questions = await generateInterviewGuide(ctx, selectedTheories)
    } catch (err) {
      console.error(`[interview-guide] generateInterviewGuide failed for project ${params.id}:`, err)
      return <GenerationError projectId={params.id} stepLabel="interview guide" retryHref={`/project/${params.id}/interview-guide`} />
    }
  }

  // Show ethics confirmed chip alongside heading
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
        {isOutdated && (
          <div style={styles.reviewBanner}>
            <span style={styles.reviewBadge}>⚠ Review changes</span>
            <p style={styles.reviewText}>
              Your framework or methodology changed, so we&apos;ve regenerated these questions. Review them, then <strong>save</strong> to confirm.
            </p>
          </div>
        )}
        <div style={styles.header}>
          <div style={styles.headingRow}>
            <h2 style={styles.heading}>Your interview guide</h2>
            <span style={styles.ethicsChip}>✓ Ethics confirmed</span>
          </div>
          <p style={styles.sub}>
            {questions.length} questions, each anchored to your framework.
          </p>
        </div>
        <InterviewGuideView
          projectId={params.id}
          questions={questions}
          theories={selectedTheories.map(t => ({ id: t.id, name: t.name }))}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', padding: '2.5rem 1rem', background: 'var(--paper)' },
  container:   { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' },
  header:      { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  headingRow:  { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' as const },
  heading:     { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 400, letterSpacing: '-0.015em', color: 'var(--ink)', lineHeight: 1.2 },
  ethicsChip:  { fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--mint)', color: 'var(--moss)', whiteSpace: 'nowrap' as const },
  sub:         { fontSize: '0.9375rem', color: 'var(--pencil)' },
  reviewBanner:{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.875rem 1.125rem', background: 'var(--marker-yellow)', borderRadius: 'var(--radius)' },
  reviewBadge: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: 'var(--warn-text)' },
  reviewText:  { fontSize: '0.875rem', color: 'var(--warn-text)', lineHeight: 1.5 },
}
