'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { isCustomId, newCustomTheoryId } from '@/lib/project-theories'
import { verifyCitation } from '@/lib/openalex'
import type { ReadingListItem, TheorySuggestion, CustomTheory } from '@/types/database'

function normDoi(raw: string): string {
  return raw.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').toLowerCase()
}
function normText(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

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

export type AddCustomState = {
  ok: boolean
  outcome: 'verified' | 'unverified' | 'duplicate' | 'empty' | 'error'
  message: string
  theoryId?: string   // id of the added (or already-existing) custom theory, so the client can select it
} | null

/**
 * Add a student's own theory by DOI or citation text. Runs it through OpenAlex
 * verification and stores the result PER-PROJECT in research_context.theories.custom_theories
 * (namespaced id, never the global `theories` table — the AI suggestion pool stays curated).
 * Verified → stored as 'doi_verified' (✓). Not found → 'unverified' (?), shown not hidden,
 * never presented as fact. Deduplicates on DOI (or normalized citation) so a double-submit
 * can't add the same theory twice. Returns a state object for useFormState — no redirect;
 * revalidatePath refreshes the card grid in place.
 */
export async function addCustomTheory(
  _prev: AddCustomState,
  formData: FormData
): Promise<AddCustomState> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, outcome: 'error', message: 'Please sign in again.' }

  const projectId = formData.get('projectId') as string
  const doi  = ((formData.get('doi') as string) ?? '').trim()
  const text = ((formData.get('citation') as string) ?? '').trim()
  const name = ((formData.get('name') as string) ?? '').trim()

  if (!doi && !text && !name) {
    return { ok: false, outcome: 'empty', message: 'Enter a DOI or citation to add a theory.' }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { ok: false, outcome: 'error', message: 'Project not found.' }

  const ctx = project.research_context
  const existing: CustomTheory[] = ctx?.theories?.custom_theories ?? []

  // Dedup BEFORE the network call when we already have an exact DOI/citation match.
  const dupeKeyDoi  = doi ? normDoi(doi) : ''
  const dupeKeyText = normText(text || name)
  const preDupe = existing.find(c =>
    (dupeKeyDoi && c.doi && normDoi(c.doi) === dupeKeyDoi) ||
    (!dupeKeyDoi && normText(c.source_citation || c.name) === dupeKeyText)
  )
  if (preDupe) {
    return { ok: false, outcome: 'duplicate', message: `"${preDupe.name}" is already in your theories.`, theoryId: preDupe.id }
  }

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

  // Re-check dedup against the resolved DOI (OpenAlex may return a DOI for a text lookup).
  const postDupe = custom.doi
    ? existing.find(c => c.doi && normDoi(c.doi) === normDoi(custom.doi!))
    : undefined
  if (postDupe) {
    return { ok: false, outcome: 'duplicate', message: `"${postDupe.name}" is already in your theories.`, theoryId: postDupe.id }
  }

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

  revalidatePath(`/project/${projectId}/theories`)

  return custom.verification === 'doi_verified'
    ? { ok: true, outcome: 'verified', message: `✓ Added "${custom.name}" — verified via OpenAlex.`, theoryId: custom.id }
    : { ok: true, outcome: 'unverified', message: `Added "${custom.name}" with a ? — verify the source yourself.`, theoryId: custom.id }
}

/**
 * Remove a student's own (custom) theory — undoes a mistake or duplicate. Drops it from
 * custom_theories, from the selection, and from reading-list items. If it was a selected
 * theory and a framework already exists, the change ripples downstream (⚠ outdated).
 */
export async function removeCustomTheory(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const customId  = formData.get('customId') as string

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const ctx = project.research_context
  const theories = ctx?.theories ?? { selected_ids: [], reading_list_items: [] }
  const wasSelected = (theories.selected_ids ?? []).includes(customId)

  const nextCustom = (theories.custom_theories ?? []).filter((c: CustomTheory) => c.id !== customId)
  const nextSelected = (theories.selected_ids ?? []).filter((id: string) => id !== customId)
  const nextReading = (theories.reading_list_items ?? []).filter(
    (r: ReadingListItem) => r.matched_theory_id !== customId
  )

  const currentOutdated: string[] = ctx?.outdated_blocks ?? []
  const outdatedBlocks = wasSelected && ctx?.framework?.edges?.length
    ? Array.from(new Set([...currentOutdated, 'framework', 'methodology', 'interview_guide']))
    : currentOutdated

  await updateResearchContext(
    projectId,
    'theories',
    {
      theories: {
        ...theories,
        selected_ids: nextSelected,
        reading_list_items: nextReading,
        custom_theories: nextCustom,
      },
      outdated_blocks: outdatedBlocks,
    },
    supabase
  )

  revalidatePath(`/project/${projectId}/theories`)
}
