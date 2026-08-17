'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { isCustomId, newCustomTheoryId } from '@/lib/project-theories'
import { verifyCitation } from '@/lib/openalex'
import type { ReadingListItem, TheorySuggestion, CustomTheory } from '@/types/database'

export async function saveTheorySelection(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId    = formData.get('projectId') as string
  const selectedIds  = JSON.parse(formData.get('selectedIds') as string) as string[]
  const suggestions  = formData.get('suggestions')
    ? (JSON.parse(formData.get('suggestions') as string) as TheorySuggestion[])
    : undefined

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const ctx = project.research_context
  const readingListRaw: string = ctx?.brief?.reading_list_raw ?? ''
  const customTheories: CustomTheory[] = ctx?.theories?.custom_theories ?? []

  // Saving theories clears the 'theories' outdated flag. If a framework already exists,
  // a (re)selection ripples down and marks the downstream blocks ⚠ outdated.
  const currentOutdated: string[] = (ctx?.outdated_blocks ?? []).filter((b: string) => b !== 'theories')
  const outdatedBlocks = ctx?.framework?.edges?.length
    ? Array.from(new Set([...currentOutdated, 'framework', 'methodology', 'interview_guide']))
    : currentOutdated

  // Reading-list items for selected *library* theories (custom ids aren't in the table).
  const globalIds = selectedIds.filter(id => !isCustomId(id))
  const { data: theories } = globalIds.length
    ? await supabase.from('theories').select('id, name, author, year, doi').in('id', globalIds)
    : { data: [] as { id: string; name: string; author: string; year: number | null; doi: string | null }[] }

  const libraryItems: ReadingListItem[] = (theories ?? []).map(t => ({
    raw_ref: `${t.author} (${t.year ?? 'n/d'}) — ${t.name}`,
    matched_theory_id: t.id,
    match_type: readingListRaw && t.author &&
      readingListRaw.toLowerCase().includes(t.author.split(/[,&]/)[0].trim().toLowerCase())
      ? 'in_list'
      : 'beyond_list',
    doi: t.doi ?? null,
  }))

  // Reading-list items for selected custom (bring-your-own) theories.
  const customItems: ReadingListItem[] = customTheories
    .filter(c => selectedIds.includes(c.id))
    .map(c => ({
      raw_ref: `${c.author} (${c.year ?? 'n/d'}) — ${c.name}`,
      matched_theory_id: c.id,
      match_type: 'beyond_list',
      doi: c.doi,
    }))

  await updateResearchContext(
    projectId,
    'theories',
    {
      theories: {
        ...(ctx?.theories ?? {}),
        selected_ids: selectedIds,
        reading_list_items: [...libraryItems, ...customItems],
        custom_theories: customTheories,
        ...(suggestions ? { suggestions } : {}),
      },
      outdated_blocks: outdatedBlocks,
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}

/**
 * Add a student's own theory by DOI or citation text. Runs it through OpenAlex
 * verification and stores the result PER-PROJECT in research_context.theories.custom_theories
 * (namespaced id, never the global `theories` table — the AI suggestion pool stays curated).
 * Verified → stored as 'doi_verified' (✓). Not found → 'unverified' (?), shown not hidden,
 * never presented as fact.
 */
export async function addCustomTheory(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const doi  = ((formData.get('doi') as string) ?? '').trim()
  const text = ((formData.get('citation') as string) ?? '').trim()
  const name = ((formData.get('name') as string) ?? '').trim()

  // Nothing to verify — bounce back without writing.
  if (!doi && !text && !name) redirect(`/project/${projectId}/theories`)

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const lookup = await verifyCitation({ doi, text })
  const m = lookup.meta

  const custom: CustomTheory = {
    id: newCustomTheoryId(),
    name: m?.name || name || text || 'Untitled theory',
    author: m?.author || 'Unknown',
    year: m?.year ?? null,
    summary: '',
    concepts: [],
    disciplines: [],
    doi: m?.doi ?? (doi || null),
    verification: lookup.verified ? 'doi_verified' : 'unverified',
    added_by_user: true,
    source_citation: text || doi || name,
  }

  const ctx = project.research_context
  const existing: CustomTheory[] = ctx?.theories?.custom_theories ?? []

  await updateResearchContext(
    projectId,
    'theories',
    {
      theories: {
        ...(ctx?.theories ?? { selected_ids: [], reading_list_items: [] }),
        custom_theories: [...existing, custom],
      },
    },
    supabase
  )

  redirect(`/project/${projectId}/theories`)
}
