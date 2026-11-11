import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Guests: visitors from /check who started a project before signing up.
 * They are Supabase anonymous users (role `authenticated`, `is_anonymous`),
 * so RLS on their own project works as for anyone. They may use only the
 * brief, Gate 1 and the "question refined" screen of their one project; the
 * email they give on that screen turns the same user into a real account.
 */

/** Max AI runs per step (brief, refined) on a guest project, so ads and bots can't burn the API. */
export const GUEST_RUN_LIMIT = 3

/** A guest has one project. */
export const GUEST_PROJECT_LIMIT = 1

/** Anonymous users who never gave an email are deleted after this many days… */
export const GUEST_TTL_DAYS = 7
/** …and those who gave one but never confirmed it, after this many. */
export const PENDING_GUEST_TTL_DAYS = 30

/** Short-lived cookie: the guest project to move to an existing account after its sign-in link. */
export const GUEST_CLAIM_COOKIE = 'methea_guest_claim'
export const GUEST_CLAIM_TTL_SECONDS = 60 * 60 * 24

type GuestFields = Pick<User, 'is_anonymous'> & { new_email?: string | null }

export function isGuest(user: GuestFields | null | undefined): boolean {
  return !!user?.is_anonymous
}

/**
 * A guest who gave their email on the save screen but hasn't opened the link
 * yet. They keep going (theories, reading, framework…) without leaving for
 * their inbox; confirming is needed only to pay or to start more projects.
 */
export function isPendingMember(user: GuestFields | null | undefined): boolean {
  return !!user?.is_anonymous && !!user.new_email
}

/**
 * Where a page that needs an account sends someone who doesn't have one:
 * nobody → sign-in; a guest → /guest, which finds their project. A guest who
 * already gave their email may use project pages; `strict` (creating projects,
 * onboarding) needs a confirmed account.
 */
export function memberOnlyRedirect(
  user: GuestFields | null | undefined,
  { strict = false }: { strict?: boolean } = {}
): string | null {
  if (!user) return '/login'
  if (user.is_anonymous && (strict || !user.new_email)) return '/guest'
  return null
}

/** The guest's place in the flow: the save screen once Gate 1 is done, else the brief (which forwards to Gate 1). */
export function guestProjectPath(projectId: string, gate1Done: boolean): string {
  return gate1Done ? `/project/${projectId}/refined?save=1` : `/project/${projectId}/brief`
}

export async function findGuestProject(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; gate1Done: boolean } | null> {
  const { data } = await supabase
    .from('projects')
    .select('id, research_context')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, gate1Done: !!data.research_context?.socratic_gate_1?.completed }
}

/** AI runs used so far on a guest project for one step. */
export function guestRunsUsed(usage: Record<string, number> | undefined, step: 'brief' | 'refined'): number {
  const n = usage?.[step]
  return typeof n === 'number' && n > 0 ? n : 0
}

// ── Claim cookie ─────────────────────────────────────────────────────────────
// When the guest's email already has an account we can't convert the guest
// user; they sign in with a normal link instead and the callback moves the
// guest project over. The cookie says which project and which guest user, and
// is signed so nobody can claim someone else's project.

function claimSecret(): string {
  const secret = process.env.GUEST_CLAIM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('No secret for the guest claim cookie')
  return secret
}

function mac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function signGuestClaim(
  projectId: string,
  guestUserId: string,
  nowMs = Date.now(),
  secret = claimSecret()
): string {
  const exp = Math.floor(nowMs / 1000) + GUEST_CLAIM_TTL_SECONDS
  const payload = `${projectId}.${guestUserId}.${exp}`
  return `${payload}.${mac(payload, secret)}`
}

export function verifyGuestClaim(
  value: string | undefined | null,
  nowMs = Date.now(),
  secret = claimSecret()
): { projectId: string; guestUserId: string } | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const [projectId, guestUserId, expRaw, sig] = parts
  const uuid = /^[0-9a-f-]{36}$/i
  if (!uuid.test(projectId) || !uuid.test(guestUserId) || !/^\d+$/.test(expRaw)) return null
  const expected = Buffer.from(mac(`${projectId}.${guestUserId}.${expRaw}`, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  if (Number(expRaw) * 1000 < nowMs) return null
  return { projectId, guestUserId }
}
