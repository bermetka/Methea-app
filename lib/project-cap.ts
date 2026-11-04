import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FREE_PROJECT_CAP, countUnpaidProjects } from '@/lib/entitlement'
import { isUnlimitedUser } from '@/lib/access'

export const FREE_CAP_ERROR = 'free-cap'
export const FREE_CAP_MESSAGE =
  `You have ${FREE_PROJECT_CAP} free projects. Unlock one or archive one to start another.`

/**
 * Server-side free project cap: max FREE_PROJECT_CAP unpaid, non-archived
 * projects per user. Expired projects count as unpaid; before PAYWALL_START
 * nothing counts; unlimited users are exempt. Redirects back to /projects with the error when full.
 */
/** True when the user can't start another free project (unlimited users never are). */
export async function isAtFreeProjectCap(supabase: SupabaseClient, userId: string): Promise<boolean> {
  // Unlimited (comp) users have no cap — the DB trigger skips them too.
  if (await isUnlimitedUser(supabase, userId)) return false

  const { data: active } = await supabase
    .from('projects')
    .select('paid_at')
    .eq('user_id', userId)
    .eq('status', 'active')

  return countUnpaidProjects(active ?? []) >= FREE_PROJECT_CAP
}

export async function enforceFreeProjectCap(supabase: SupabaseClient, userId: string) {
  if (await isAtFreeProjectCap(supabase, userId)) {
    redirect(`/projects?error=${FREE_CAP_ERROR}`)
  }
}
