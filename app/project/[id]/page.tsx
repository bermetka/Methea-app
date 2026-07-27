import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isProjectPaid } from '@/lib/entitlement'
import ProjectDashboard from './ProjectDashboard'
import type { Project, ResearchContext, Theory } from '@/types/database'

export async function generateMetadata() {
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

  // Route to active wizard step if not yet at dashboard
  if (!p.research_context?.brief)                              redirect(`/project/${params.id}/brief`)
  if (!p.research_context?.socratic_gate_1?.completed)         redirect(`/project/${params.id}/gate1`)
  if (!p.research_context?.theories?.selected_ids?.length)     redirect(`/project/${params.id}/theories`)
  if (!p.research_context?.framework?.edges?.length)           redirect(`/project/${params.id}/framework`)

  const ctx         = p.research_context
  const selectedIds = ctx.theories!.selected_ids

  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year')
    .in('id', selectedIds)

  const selectedTheories = (theories ?? []) as Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]

  const paid = isProjectPaid(p)

  // Framework diagram (edges) is the free teaser — always safe to send.
  // Narrative/citations, methodology, interview guide, and findings are paid-only.
  // These must not just be hidden in the JSX for unpaid renders — they must never
  // be serialized into the client component's props at all, since a pre-existing
  // project (from before this paywall shipped) can already have real narrative,
  // methodology, interview-guide, or findings content sitting in research_context
  // even though it isn't paid. Passing `ctx` wholesale to a client component embeds
  // the whole object in the RSC/hydration payload regardless of what the JSX
  // chooses to render — same class of bug fixed on the framework page (115b6b8)
  // and the export page (3280824).
  const clientCtx: ResearchContext = paid
    ? ctx
    : {
        ...ctx,
        framework: ctx.framework
          ? { ...ctx.framework, narrative: '', citations: [], citation_statuses: {} }
          : ctx.framework,
        methodology: undefined,
        interview_guide: undefined,
        findings: undefined,
      }

  // Computed from clientCtx (post-sanitization), not the raw ctx — so an unpaid
  // project can never resolve isComplete to true from stripped-but-previously-real
  // methodology/interview-guide/findings data. This keeps the "Export full
  // proposal →" header link hidden for unpaid projects without needing a separate
  // `paid` check in the formula itself.
  const isComplete =
    !!clientCtx.methodology?.narrative &&
    !!clientCtx.interview_guide?.questions?.length &&
    !!clientCtx.findings?.gate3_completed

  return (
    <ProjectDashboard
      projectId={params.id}
      ctx={clientCtx}
      theories={selectedTheories}
      isComplete={isComplete}
      paid={paid}
    />
  )
}
