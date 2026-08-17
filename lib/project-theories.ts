import type { SupabaseClient } from '@supabase/supabase-js'
import type { ResearchContext, Theory, CustomTheory } from '@/types/database'

/**
 * Custom (bring-your-own) theories are namespaced so they can share the
 * selected_ids array with global library theory UUIDs without collision.
 */
export function isCustomId(id: string): boolean {
  return id.startsWith('custom:')
}

export function newCustomTheoryId(): string {
  return 'custom:' + crypto.randomUUID()
}

// Map a stored CustomTheory into the Theory shape the rest of the app consumes.
function customToTheory(c: CustomTheory): Theory {
  return {
    id: c.id,
    name: c.name,
    author: c.author,
    year: c.year ?? 0,
    summary: c.summary,
    concepts: c.concepts,
    disciplines: c.disciplines,
    doi: c.doi,
    openalex_id: null,
    created_at: '',
  }
}

/**
 * Resolve a project's selected theory ids into full Theory objects, merging
 * global library rows with per-project custom theories. This is the single
 * point every downstream site (framework, methodology, interview-guide,
 * export, dashboard, analysis) uses so custom theories are first-class in
 * generation and display — never just stored. Order follows selectedIds;
 * ids that resolve to nothing are dropped.
 */
export async function resolveProjectTheories(
  ctx: ResearchContext,
  selectedIds: string[],
  supabase: SupabaseClient
): Promise<Theory[]> {
  const customById = new Map(
    (ctx.theories?.custom_theories ?? []).map(c => [c.id, customToTheory(c)])
  )
  const globalIds = selectedIds.filter(id => !isCustomId(id))

  let globalById = new Map<string, Theory>()
  if (globalIds.length) {
    const { data } = await supabase.from('theories').select('*').in('id', globalIds)
    globalById = new Map(((data as Theory[]) ?? []).map(t => [t.id, t]))
  }

  return selectedIds
    .map(id => (isCustomId(id) ? customById.get(id) : globalById.get(id)))
    .filter((t): t is Theory => !!t)
}
