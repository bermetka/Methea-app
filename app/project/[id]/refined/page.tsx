import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { refineQuestion, refineSource } from '@/lib/prompts/refine'
import { GUEST_RUN_LIMIT, guestRunsUsed } from '@/lib/guest'
import RefinedView from './RefinedView'
import type { Project, RefinedQuestion } from '@/types/database'

// Claude runs while this page renders — allow up to 60s instead of the platform default.
export const maxDuration = 60

export const metadata = { title: 'Your research question, sharpened — Methea' }

/**
 * After Gate 1: the student's question before and after their answers. The
 * moment of value — and, for a guest, where we ask for an email to save it.
 */
export default async function RefinedPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { save?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const guest = !!user.is_anonymous
  // A guest who already gave their email carries on like a member (confirming is needed only to pay).
  const needsEmail = guest && !user.new_email

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!project) redirect(guest ? '/guest' : '/projects')

  const p = project as Project
  const ctx = p.research_context
  if (!ctx?.brief) redirect(`/project/${params.id}/brief`)
  const gate1 = ctx.socratic_gate_1
  if (!gate1?.completed) redirect(`/project/${params.id}/gate1`)

  // Make the refined question, or make it again when the answers changed since.
  const source = refineSource(gate1.responses, gate1.context_note)
  let refined: RefinedQuestion | null = gate1.refined ?? null
  const runs = guestRunsUsed(ctx.guest_usage, 'refined')
  const canRun = !guest || runs < GUEST_RUN_LIMIT
  if ((!refined || refined.source !== source) && canRun) {
    try {
      refined = await refineQuestion(ctx.brief, gate1.questions, gate1.responses, gate1.context_note)
      await updateResearchContext(
        params.id,
        'socratic_gate_1',
        {
          socratic_gate_1: { ...gate1, refined },
          ...(guest ? { guest_usage: { ...ctx.guest_usage, refined: runs + 1 } } : {}),
        },
        supabase
      )
    } catch (err) {
      console.error(`[refined] refineQuestion failed for project ${params.id}:`, err)
      // A stale question is better than none; with none, the view offers to go on.
      refined = gate1.refined ?? null
    }
  }

  const nextHref = ctx.theories?.selected_ids?.length
    ? `/project/${params.id}`
    : `/project/${params.id}/theories`

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <RefinedView
          projectId={params.id}
          // Their own words, not the question Methea already tidied up from the brief.
          before={ctx.brief.input_topic || ctx.seed?.topic || ctx.brief.research_question || ctx.brief.topic}
          after={refined?.question ?? null}
          changes={refined?.changes ?? []}
          guest={needsEmail}
          nextHref={nextHref}
          openSave={needsEmail && searchParams.save === '1'}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2.5rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
}
