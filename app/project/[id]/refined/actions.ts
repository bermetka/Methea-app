'use server'

import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { GUEST_CLAIM_COOKIE, GUEST_CLAIM_TTL_SECONDS, signGuestClaim } from '@/lib/guest'

export type SaveGuestResult =
  | { ok: true; existing: boolean }
  | { ok: false; error: 'INVALID_EMAIL' | 'NOT_GUEST' | 'FAILED' }

function siteOrigin(): string {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/**
 * The guest gives an email to keep their project. Normally the same anonymous
 * user becomes a real account (Supabase sends a confirmation link; after it the
 * project is simply theirs). If the email already has an account, we send a
 * normal sign-in link instead and the auth callback moves this project over,
 * using a signed short-lived cookie that names the project and the guest.
 */
export async function saveGuestEmail(projectId: string, rawEmail: string): Promise<SaveGuestResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: 'INVALID_EMAIL' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.is_anonymous) return { ok: false, error: 'NOT_GUEST' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!project) return { ok: false, error: 'NOT_GUEST' }

  const origin = siteOrigin()
  // The email templates append `&token_hash=…&type=…` to this URL ({{ .RedirectTo }}).
  // They keep going right away; the link (opened whenever) confirms the account and lands on the project.
  const convertParams = new URLSearchParams({ next: `/project/${projectId}`, from: 'guest' })
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${origin}/auth/callback?${convertParams}` }
  )
  if (!error) return { ok: true, existing: false }

  const taken = error.code === 'email_exists' || /already (been )?registered|already exists/i.test(error.message)
  if (!taken) {
    console.error('[guest] updateUser failed:', error.message)
    return { ok: false, error: 'FAILED' }
  }

  // Existing account: sign-in link, and remember which guest project to bring along.
  cookies().set(GUEST_CLAIM_COOKIE, signGuestClaim(projectId, user.id), {
    path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: GUEST_CLAIM_TTL_SECONDS,
  })
  const claimParams = new URLSearchParams({ next: '/projects', from: 'guest', claim: '1' })
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?${claimParams}`, shouldCreateUser: false },
  })
  if (otpError) {
    console.error('[guest] sign-in link for existing account failed:', otpError.message)
    return { ok: false, error: 'FAILED' }
  }
  return { ok: true, existing: true }
}
