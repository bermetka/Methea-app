import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasFullAccess, isPaywallTester, isPaywallActive } from '@/lib/entitlement'

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

/** The owner-level inputs to hasFullAccess: comp flag and early-paywall tester. */
export async function accessOptions(supabase: SupabaseClient, userId: string) {
  return { unlimited: await isUnlimitedUser(supabase, userId), paywallTester: isPaywallTester(userId) }
}

export async function requireFullAccess(supabase: SupabaseClient, projectId: string, userId: string) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, research_context, paid_at')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) redirect('/projects')
  if (!hasFullAccess(project, await accessOptions(supabase, userId))) {
    redirect(`/project/${projectId}`)
  }
  return project
}

/**
 * True when the user has at least one active project without full access while the
 * paywall is on: the account menu then shows an "Upgrade" badge on Plan & billing.
 */
export async function hasLockedProjects(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const options = await accessOptions(supabase, userId)
  if (options.unlimited || (!options.paywallTester && !isPaywallActive())) return false
  const { data } = await supabase
    .from('projects')
    .select('paid_at')
    .eq('user_id', userId)
    .eq('status', 'active')
  return (data ?? []).some(p => !hasFullAccess(p, options))
}
