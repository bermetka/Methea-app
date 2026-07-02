'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import type { InterviewQuestion } from '@/types/database'

export async function confirmEthics(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string

  await updateResearchContext(projectId, 'ethics', { ethics_confirmed: true }, supabase)
  // No redirect — caller refreshes page
}

export async function saveInterviewGuide(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const questions: InterviewQuestion[] = JSON.parse(formData.get('questions') as string)

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .single()

  const outdatedBlocks = (project?.research_context?.outdated_blocks ?? [] as string[])
    .filter((b: string) => b !== 'interview_guide')

  await updateResearchContext(
    projectId,
    'interview_guide',
    { interview_guide: { questions }, outdated_blocks: outdatedBlocks },
    supabase
  )

  redirect(`/project/${projectId}`)
}
