import { NextResponse } from 'next/server'
import { EventName } from '@paddle/paddle-node-sdk'
import { verifyPaddleWebhook } from '@/lib/paddle/verify-webhook'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Paddle webhook receiver. This route — and ONLY this route — is allowed to
 * construct `createServiceRoleClient()` and write `projects.paid_at` /
 * `projects.paddle_transaction_id`. Do not import the service-role client
 * anywhere else; it bypasses RLS entirely (see lib/supabase/service-role.ts).
 *
 * Signature verification MUST happen before any Supabase call of any kind —
 * an invalid signature returns 401 immediately with zero DB access.
 */
export async function POST(request: Request) {
  // Read the raw body as text BEFORE any JSON parsing — signature
  // verification needs the exact byte string Paddle signed.
  const rawBody = await request.text()
  const signature = request.headers.get('paddle-signature')

  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 })
  }

  const event = await verifyPaddleWebhook(rawBody, signature, process.env.PADDLE_WEBHOOK_SECRET!)
  if (!event) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // Only act on a completed one-time payment. Refund/other events
  // (transaction.payment_refunded, adjustment.created, etc.) are
  // intentionally acknowledged with no action — see plan Task 13 notes /
  // design spec for why auto-revoke is out of scope for this iteration.
  if (event.eventType === EventName.TransactionCompleted) {
    // event is narrowed to TransactionCompletedEvent here; event.data is a
    // TransactionNotification (id: string, customData: Record<string, any> | null).
    const projectId = event.data.customData?.project_id as string | undefined
    const transactionId = event.data.id

    if (!projectId) {
      // Nothing to map this payment to — acknowledge so Paddle doesn't retry
      // forever, but this should never happen if UnlockButton always sends
      // customData correctly.
      return NextResponse.json({ received: true, warning: 'no project_id in customData' })
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('projects')
      .update({ paid_at: new Date().toISOString(), paddle_transaction_id: transactionId })
      .eq('id', projectId)
      .is('paid_at', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
