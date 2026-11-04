import type { SupabaseClient } from '@supabase/supabase-js'
import { isAtFreeProjectCap, FREE_CAP_ERROR } from '@/lib/project-cap'
import { projectTitleFromCheck, type CheckCarry } from '@/lib/check'

/**
 * Start a project from the /check result: their question becomes the working
 * title and pre-fills the brief (they still review and submit it themselves —
 * Gate 1 starts from what they wrote). Returns where to send them next.
 * Never throws: on any failure they land on /projects as before.
 */
export async function startProjectFromCheck(
  supabase: SupabaseClient,
  userId: string,
  check: CheckCarry
): Promise<string> {
  try {
    if (await isAtFreeProjectCap(supabase, userId)) return `/projects?error=${FREE_CAP_ERROR}`

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: projectTitleFromCheck(check.q),
        research_context: {
          version: 1,
          outdated_blocks: [],
          seed: { source: 'check', topic: check.q, path: check.path, stage: check.stage },
        },
        context_version: 1,
      })
      .select('id')
      .single()

    if (error || !project) {
      console.error('[check] project from check failed:', error?.message)
      return '/projects'
    }
    return `/project/${project.id}/brief`
  } catch (err) {
    console.error('[check] project from check failed:', err)
    return '/projects'
  }
}
