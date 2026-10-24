import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasFullAccess } from '@/lib/entitlement'

/**
 * Server-action guard: generation, regeneration and saving paid content need
 * full access. Pages already hide these controls for unpaid projects, but the
 * actions are callable directly, so they must check too. Redirects to the
 * project (which shows the unlock prompt) when access is missing.
 */
/**
 * The user's comp flag (profiles.unlimited). Read through their own session —
 * RLS lets a user read only their own profile, and they can't write it.
 */
export async function isUnlimitedUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('unlimited').eq('id', userId).maybeSingle()
  return data?.unlimited === true
}

export async function requireFullAccess(supabase: SupabaseClient, projectId: string, userId: string) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, research_context, paid_at')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) redirect('/projects')
  if (!hasFullAccess(project, { unlimited: await isUnlimitedUser(supabase, userId) })) {
    redirect(`/project/${projectId}`)
  }
  return project
}
