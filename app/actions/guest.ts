'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/** Send the confirmation link again to the email a guest gave on the save screen. */
export async function resendGuestConfirmation(projectId: string): Promise<{ ok: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.is_anonymous || !user.new_email) return { ok: false }

  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const params = new URLSearchParams({ next: `/project/${projectId}`, from: 'guest' })
  const { error } = await supabase.auth.updateUser(
    { email: user.new_email },
    { emailRedirectTo: `${proto}://${host}/auth/callback?${params}` }
  )
  if (error) console.error('[guest] resend confirmation failed:', error.message)
  return { ok: !error }
}
