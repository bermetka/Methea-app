import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveProjectTheories } from '@/lib/project-theories'
import { accessOptions } from '@/lib/access'
import { hasFullAccess } from '@/lib/entitlement'
import { getUnlockInfo } from '@/lib/checkout'
import ExportView from './ExportView'
import type { Project, ResearchContext } from '@/types/database'

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

  // Library + custom theories merged, so a student's own theory appears in the export too.
  const theories = await resolveProjectTheories(ctx, selectedIds, supabase)

  // Full export is locked without full access (paid in window, or before PAYWALL_START).
  const paid = hasFullAccess(p, await accessOptions(supabase, user.id))

  // This page IS the full export, which is locked without full access, so paid
  // content (narrative/citations, methodology, interview guide, findings) is not
  // even serialized into the client props for unpaid renders. Already generated
  // content stays viewable, read-only, on the dashboard and each step's own page.
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
      theories={theories}
      paid={paid}
      unlock={paid ? null : await getUnlockInfo(p, user)}
    />
  )
}
