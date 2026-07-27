import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isProjectPaid } from '@/lib/entitlement'
import ExportView from './ExportView'
import type { Project, ResearchContext, Theory } from '@/types/database'

export async function generateMetadata() {
  return { title: 'Export proposal — Methea' }
}

export default async function ExportPage({ params }: { params: { id: string } }) {
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

  const p   = project as Project
  const ctx = p.research_context

  if (!ctx?.brief) redirect(`/project/${params.id}`)

  const selectedIds = ctx.theories?.selected_ids ?? []

  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year')
    .in('id', selectedIds.length ? selectedIds : ['__none__'])

  const paid = isProjectPaid(p)

  // Framework diagram (edges) is the free teaser — always safe to send.
  // Narrative/citations, methodology, interview guide, and findings are paid-only.
  // These must not just be hidden in the JSX for unpaid renders — they must never
  // be serialized into the client component's props at all, since a pre-existing
  // project (from before this paywall shipped) can already have real narrative,
  // methodology, or interview-guide content sitting in research_context even
  // though it isn't paid. Passing `ctx` wholesale to a client component embeds
  // the whole object in the RSC/hydration payload regardless of what the JSX
  // chooses to render — same class of bug fixed in the framework page (115b6b8).
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

  return (
    <ExportView
      projectId={params.id}
      ctx={clientCtx}
      theories={(theories ?? []) as Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]}
      paid={paid}
    />
  )
}
