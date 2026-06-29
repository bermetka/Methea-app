import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectDashboard from './ProjectDashboard'
import type { Project, Theory } from '@/types/database'

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

  const isComplete =
    !!ctx.methodology?.narrative &&
    !!ctx.interview_guide?.questions?.length &&
    !!ctx.findings?.gate3_completed

  return (
    <ProjectDashboard
      projectId={params.id}
      ctx={ctx}
      theories={selectedTheories}
      isComplete={isComplete}
    />
  )
}
