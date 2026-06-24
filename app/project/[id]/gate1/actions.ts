'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'

export async function submitGate1(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const answers   = JSON.parse(formData.get('answers') as string) as Record<string, string>

  const { data: project } = await supabase
    .from('projects')
    .select('research_context, context_version')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  // Preserve the questions array stored by submitBrief
  const existingGate1 = project.research_context?.socratic_gate_1 ?? {}

  await updateResearchContext(
    projectId,
    'socratic_gate_1',
    {
      socratic_gate_1: {
        ...existingGate1,
        completed: true,
        responses: answers,
      },
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}
