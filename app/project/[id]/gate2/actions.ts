'use server'

import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { resolveProjectTheories } from '@/lib/project-theories'
import { parseReadingList } from '@/lib/prompts/reading-list'
import { checkStudentList } from '@/lib/literature/check-list'
import type { Project, ResearchContext, StudentReadingList } from '@/types/database'
import { accessOptions } from '@/lib/access'
import { hasFullAccess } from '@/lib/entitlement'
import { gateStudentList, type ListPreview } from '@/lib/reading-gate'

async function loadProject(projectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: project } = await supabase
    .from('projects')
    .select('id, research_context, paid_at')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return null
  return {
    supabase,
    ctx: project.research_context as ResearchContext,
    paid: hasFullAccess(project as Pick<Project, 'paid_at'>, await accessOptions(supabase, user.id)),
  }
}

export type CheckListResult =
  | { ok: true; list: StudentReadingList; preview: ListPreview | null }
  | { ok: false; error: string }

/**
 * Check the student's own reading list against OpenAlex/Crossref and her theories.
 * `text` replaces the list from the brief when given (she can paste or edit it in Gate 2).
 */
export async function checkReadingList(projectId: string, text?: string): Promise<CheckListResult> {
  const loaded = await loadProject(projectId)
  if (!loaded) return { ok: false, error: 'Project not found.' }
  const { supabase, ctx, paid } = loaded

  const raw = (text ?? ctx.brief?.reading_list_raw ?? '').trim()
  if (!raw) return { ok: false, error: 'Paste your reading list first.' }

  const selectedIds = ctx.theories?.selected_ids ?? []
  const theories = await resolveProjectTheories(ctx, selectedIds, supabase)
  const concepts = Array.from(new Set(theories.flatMap(t => t.concepts ?? [])))
  const question = ctx.brief?.research_question ?? ''

  try {
    const { items: parsed, truncated } = await parseReadingList(raw)
    if (!parsed.length) return { ok: false, error: "Methea couldn't find references in that text. Put one reference per line and try again." }

    const items = await checkStudentList(parsed, theories, concepts, question)
    const list: StudentReadingList = {
      items,
      checked_for: [...selectedIds].sort().join(','),
      checked_at: new Date().toISOString(),
      ...(truncated ? { truncated: true } : {}),
    }

    await updateResearchContext(
      projectId,
      'reading_list',
      {
        ...(text !== undefined && ctx.brief ? { brief: { ...ctx.brief, reading_list_raw: raw } } : {}),
        theories: { ...(ctx.theories ?? { selected_ids: [], reading_list_items: [] }), student_list: list },
      },
      supabase
    )
    // Unpaid: the summary and one linked work; the per-work breakdown is part of the unlock.
    const gated = gateStudentList(list, paid)
    return { ok: true, list: gated.list!, preview: gated.preview }
  } catch (err) {
    console.error(`[gate2] checkReadingList failed for ${projectId}:`, err)
    return { ok: false, error: "We couldn't check your list just now. Nothing was lost; please try again." }
  }
}

export async function toggleRead(projectId: string, key: string, read: boolean): Promise<string[]> {
  const loaded = await loadProject(projectId)
  if (!loaded) return []
  const { supabase, ctx } = loaded
  const marks = new Set(ctx.theories?.read_marks ?? [])
  if (read) marks.add(key)
  else marks.delete(key)
  const next = Array.from(marks)
  await updateResearchContext(
    projectId,
    'reading_list',
    { theories: { ...(ctx.theories ?? { selected_ids: [], reading_list_items: [] }), read_marks: next } },
    supabase
  )
  return next
}

/** Gate 2: the theory–timeline fit check. Returns where to go next. */
export async function completeGate2(projectId: string, fitsTimeline: boolean): Promise<string> {
  const loaded = await loadProject(projectId)
  if (!loaded) return `/projects`
  const { supabase, ctx } = loaded
  await updateResearchContext(
    projectId,
    'socratic_gate_2',
    { socratic_gate_2: { completed: fitsTimeline, theory_timeline_ok: fitsTimeline } },
    supabase
  )
  if (!fitsTimeline) return `/project/${projectId}/theories`
  return ctx.framework?.edges?.length ? `/project/${projectId}` : `/project/${projectId}/framework`
}

