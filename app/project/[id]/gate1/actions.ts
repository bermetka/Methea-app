'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'

export async function submitGate1(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId   = formData.get('projectId') as string
  const answers     = JSON.parse(formData.get('answers') as string) as Record<string, string>
  const contextNote = ((formData.get('contextNote') as string) ?? '').trim()

  const { data: project } = await supabase
    .from('projects')
    .select('research_context, context_version')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const ctx = project.research_context
  // Preserve the questions array stored by submitBrief
  const existingGate1 = ctx?.socratic_gate_1 ?? {}

  // Editing gate 1 answers/context feeds theory suggestions and everything downstream.
  // When something actually changed and downstream blocks exist, soft-invalidate them
  // (mirrors the theory-swap ripple). Never auto-regenerate — just mark ⚠ outdated.
  const changed =
    JSON.stringify(existingGate1.responses ?? {}) !== JSON.stringify(answers) ||
    (existingGate1.context_note ?? '') !== contextNote
  const currentOutdated: string[] = ctx?.outdated_blocks ?? []
  const outdatedBlocks = changed && ctx?.theories?.selected_ids?.length
    ? Array.from(new Set([...currentOutdated, 'theories', 'framework', 'methodology', 'interview_guide']))
    : currentOutdated

  await updateResearchContext(
    projectId,
    'socratic_gate_1',
    {
      socratic_gate_1: {
        ...existingGate1,
        completed: true,
        responses: answers,
        context_note: contextNote,
      },
      outdated_blocks: outdatedBlocks,
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}
