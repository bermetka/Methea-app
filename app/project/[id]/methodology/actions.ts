'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireFullAccess } from '@/lib/access'
import { updateResearchContext } from '@/lib/research-context'

export async function saveMethodology(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const chain     = JSON.parse(formData.get('chain') as string)
  await requireFullAccess(supabase, projectId, user.id)

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .single()

  const outdatedBlocks = (project?.research_context?.outdated_blocks ?? [] as string[])
    .filter((b: string) => b !== 'methodology')

  await updateResearchContext(
    projectId,
    'methodology',
    { methodology: chain, outdated_blocks: outdatedBlocks },
    supabase
  )

  redirect(`/project/${projectId}`)
}
