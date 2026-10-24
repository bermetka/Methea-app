'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { hasFullAccess } from '@/lib/entitlement'
import type { FrameworkEdge, FrameworkCitation } from '@/types/database'

export async function saveFramework(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId          = formData.get('projectId') as string
  const layout             = formData.get('layout') as 'hierarchy' | 'hub-and-spoke' | 'linear'
  const edges              = JSON.parse(formData.get('edges') as string) as FrameworkEdge[]
  const narrative          = formData.get('narrative') as string
  const citations          = JSON.parse(formData.get('citations') as string) as FrameworkCitation[]
  const citationStatuses   = JSON.parse(formData.get('citationStatuses') as string) as Record<string, 'doi_verified' | 'classic_verified' | 'unverified'>

  const { data: project } = await supabase
    .from('projects')
    .select('id, research_context, paid_at')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  // Saving/editing the framework narrative is a paid action — the UI already
  // hides this button when unpaid, but the server action itself must also
  // reject direct calls, since research_context stays writable at the DB
  // grant level for legitimate free-tier writes (e.g. diagram persistence).
  if (!hasFullAccess(project)) {
    redirect(`/project/${projectId}/framework`)
  }

  const outdatedBlocks = (project.research_context?.outdated_blocks ?? [] as string[])
    .filter((b: string) => b !== 'framework')

  await updateResearchContext(
    projectId,
    'framework',
    {
      outdated_blocks: outdatedBlocks,
      framework: {
        layout_preset: layout,
        edges,
        narrative,
        citations,
        citation_statuses: citationStatuses,
      },
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}
