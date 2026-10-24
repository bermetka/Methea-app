import { NextResponse } from 'next/server'
import { EventName } from '@paddle/paddle-node-sdk'
import { verifyPaddleWebhook } from '@/lib/paddle/verify-webhook'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { metheaVariantOf, paymentRecordFromTransaction } from '@/lib/paddle/payment-record'
import { isProjectPaid } from '@/lib/entitlement'
import { trackServerEvent } from '@/lib/funnel'

/**
 * Paddle webhook receiver. This route — and ONLY this route — writes
 * `projects.paid_at` and the payment fields (amount_paid, currency,
 * paid_price_variant, discount_code, paddle_transaction_id), via the
 * service-role client (see lib/supabase/service-role.ts for its other use).
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
    // The Paddle account is shared with other products (o-nion, SOLA): only a
    // transaction for one of OUR prices (server-side PADDLE_PRICE_ID_A/_B) may
    // unlock a project. Anything else is acknowledged and ignored.
    if (!metheaVariantOf(event.data)) {
      return NextResponse.json({ received: true, ignored: 'not a Methea price' })
    }

    const projectId = event.data.customData?.project_id as string | undefined

    if (!projectId) {
      // Nothing to map this payment to — acknowledge so Paddle doesn't retry
      // forever, but this should never happen if UnlockButton always sends
      // customData correctly.
      return NextResponse.json({ received: true, warning: 'no project_id in customData' })
    }

    const supabase = createServiceRoleClient()
    const { data: project, error: readError } = await supabase
      .from('projects')
      .select('user_id, paid_at, paddle_transaction_id')
      .eq('id', projectId)
      .maybeSingle()

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 })
    }
    if (!project) {
      return NextResponse.json({ received: true, warning: 'unknown project' })
    }

    // Idempotent: Paddle retries deliveries, and the same transaction must never apply twice.
    if (project.paddle_transaction_id === event.data.id) {
      return NextResponse.json({ received: true })
    }

    // First payment, or a re-buy after the 6-month window ended (new window from now).
    // A payment on a project still inside its window doesn't change it.
    if (isProjectPaid(project)) {
      return NextResponse.json({ received: true, warning: 'project already paid' })
    }

    const payment = paymentRecordFromTransaction(event.data)
    const update = supabase
      .from('projects')
      .update({ paid_at: new Date().toISOString(), ...payment })
      .eq('id', projectId)
    // Only apply if paid_at is unchanged since the read (concurrent deliveries).
    const { error } = await (project.paid_at ? update.eq('paid_at', project.paid_at) : update.is('paid_at', null))

    if (error) {
      // Unique index on paddle_transaction_id: this transaction is already recorded elsewhere.
      if (error.code === '23505') {
        return NextResponse.json({ received: true, warning: 'transaction already recorded' })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await trackServerEvent('purchase', project.user_id, {
      props: {
        project_id: projectId,
        amount: payment.amount_paid,
        currency: payment.currency,
        price_variant: payment.paid_price_variant,
        discount_code: payment.discount_code,
      },
      once: payment.paddle_transaction_id,
    })
  }

  return NextResponse.json({ received: true })
}
