import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyGuestClaim } from '@/lib/guest'
import { isAtFreeProjectCap, FREE_CAP_ERROR } from '@/lib/project-cap'

/**
 * A guest whose email already had an account signed in with a normal link.
 * Move the guest project into that account — only when the signed claim cookie
 * is valid, the project still belongs to that guest, and the guest is still
 * anonymous. Returns where to go next, or null to keep the default.
 * Service role: the project belongs to another (anonymous) user until moved.
 * Never throws.
 */
export async function claimGuestProject(
  supabase: SupabaseClient,
  userId: string,
  cookieValue: string | undefined
): Promise<string | null> {
  try {
    const claim = verifyGuestClaim(cookieValue)
    if (!claim || claim.guestUserId === userId) return null

    const admin = createServiceRoleClient()
    const { data: guest } = await admin.auth.admin.getUserById(claim.guestUserId)
    if (!guest?.user?.is_anonymous) return null

    const { data: project } = await admin
      .from('projects')
      .select('id, user_id')
      .eq('id', claim.projectId)
      .maybeSingle()
    if (!project || project.user_id !== claim.guestUserId) return null

    if (await isAtFreeProjectCap(supabase, userId)) return `/projects?error=${FREE_CAP_ERROR}`

    const { error } = await admin.from('projects').update({ user_id: userId }).eq('id', project.id)
    if (error) {
      console.error('[guest] moving guest project failed:', error.message)
      return null
    }
    return `/project/${project.id}/theories`
  } catch (err) {
    console.error('[guest] claim failed:', err)
    return null
  }
}
