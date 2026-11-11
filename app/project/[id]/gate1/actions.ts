'use server'

import { redirect } from 'next/navigation'
import { trackEvent } from '@/lib/funnel'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { answerValues } from '@/lib/gate1-answers'
import type { Gate1Answer } from '@/types/database'

export async function submitGate1(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId   = formData.get('projectId') as string
  const answers     = parseAnswers(formData.get('answers'))
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

  await trackEvent('gate1_done', { props: { guest: !!user.is_anonymous }, once: projectId })
  // Next: the "question refined" screen (before/after), which makes the refined
  // question and links on to theories — or, for a guest, asks for an email.
  // Returned instead of redirecting, so the client navigates and its loading screen shows at once.
  return `/project/${projectId}/refined`
}

/** Answers from the form: a value per question, or a list for a multi question. Anything else is dropped. */
function parseAnswers(raw: FormDataEntryValue | null): Record<string, Gate1Answer> {
  let parsed: unknown
  try { parsed = JSON.parse(typeof raw === 'string' ? raw : '{}') } catch { return {} }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out: Record<string, Gate1Answer> = {}
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!/^q\d$/.test(id)) continue
    const values = answerValues(value as Gate1Answer)
    if (!values.length) continue
    out[id] = Array.isArray(value) ? values.slice(0, 6) : values[0]
  }
  return out
}
