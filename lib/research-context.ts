import type { SupabaseClient } from '@supabase/supabase-js'
import type { ResearchContext } from '@/types/database'

/**
 * Atomically updates one block of research_context, increments the version,
 * and writes a snapshot to research_context_versions.
 *
 * All server actions that touch research_context must go through this —
 * never write to the projects table directly.
 */
export async function updateResearchContext(
  projectId: string,
  changedBlock: string,
  patch: Partial<ResearchContext>,
  supabase: SupabaseClient
): Promise<ResearchContext> {
  const { data: project, error: readError } = await supabase
    .from('projects')
    .select('research_context, context_version')
    .eq('id', projectId)
    .single()

  if (readError || !project) {
    throw new Error(`Could not read project: ${readError?.message}`)
  }

  const current: ResearchContext = project.research_context
  const newVersion = (project.context_version as number) + 1

  const updated: ResearchContext = {
    ...current,
    ...patch,
    version: newVersion,
  }

  await supabase.from('research_context_versions').insert({
    project_id: projectId,
    version: newVersion,
    context_snapshot: updated,
    changed_block: changedBlock,
  })

  const { error: writeError } = await supabase
    .from('projects')
    .update({
      research_context: updated,
      context_version: newVersion,
    })
    .eq('id', projectId)

  if (writeError) {
    throw new Error(`Could not update research_context: ${writeError.message}`)
  }

  return updated
}
