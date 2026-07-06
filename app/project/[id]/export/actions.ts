'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'

export async function incrementExportCount(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .single()

  const current = (project?.research_context?.export_count ?? 0) as number

  await updateResearchContext(projectId, 'export', { export_count: current + 1 }, supabase)
}
