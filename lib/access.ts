import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasFullAccess } from '@/lib/entitlement'

/**
 * Server-action guard: generation, regeneration and saving paid content need
 * full access. Pages already hide these controls for unpaid projects, but the
 * actions are callable directly, so they must check too. Redirects to the
 * project (which shows the unlock prompt) when access is missing.
 */
export async function requireFullAccess(supabase: SupabaseClient, projectId: string, userId: string) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, research_context, paid_at')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) redirect('/projects')
  if (!hasFullAccess(project)) redirect(`/project/${projectId}`)
  return project
}
