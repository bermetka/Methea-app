'use client'

import { useEffect, useRef, useState } from 'react'
import { initializePaddle, CheckoutEventNames, type CheckoutEventsData, type Paddle } from '@paddle/paddle-js'
import { foundingBannerText, priceFromLabel, type CheckoutContext } from '@/lib/pricing'
import { trackUnlockClick } from '@/app/actions/funnel'
import { resendGuestConfirmation } from '@/app/actions/guest'
import { pushConversion } from '@/lib/consent'

interface Props {
  projectId: string
  checkout: CheckoutContext
  compact?: boolean
  /** Replaces "Unlock this project", e.g. "Continue to methodology". */
  label?: string
}

// idle transitions: loading (Paddle.js still booting) -> idle (ready to click)
// -> opening (checkout overlay open) -> finalizing (waiting on webhook) -> reload.
// 'error' covers initializePaddle resolving without a Paddle instance (e.g. bad
// token/config) so the button never sits in a clickable-but-silently-broken state.
type Status = 'loading' | 'idle' | 'opening' | 'finalizing' | 'error'

export default function UnlockButton(props: Props) {
  // A guest who gave an email but hasn't confirmed it: confirm first, then pay.
  if (props.checkout.confirmEmailFirst != null) {
    return <ConfirmEmailFirst projectId={props.projectId} email={props.checkout.confirmEmailFirst} />
  }
  return <CheckoutButton {...props} />
}

function ConfirmEmailFirst({ projectId, email }: { projectId: string; email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  async function resend() {
    setState('sending')
    const res = await resendGuestConfirmation(projectId)
    setState(res.ok ? 'sent' : 'error')
  }
  return (
    <div style={s.confirm}>
      <p style={s.confirmText}>
        To unlock, confirm your email first: open the link we sent{email ? <> to <strong>{email}</strong></> : ''}. You&apos;ll come straight back here.
      </p>
      <button type="button" onClick={resend} disabled={state === 'sending' || state === 'sent'} style={s.resendBtn}>
        {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent — check your inbox' : state === 'error' ? 'Couldn’t send — try again' : 'Send the link again'}
      </button>
    </div>
  )
}

function CheckoutButton({ projectId, checkout, compact, label: customLabel }: Props) {
  const label = customLabel
    ? `${customLabel} — ${checkout.priceLabel} →`
    : compact
      ? `Unlock — ${checkout.priceLabel} →`
      : `Unlock this project — ${checkout.priceLabel} →`
  const paddleRef = useRef<Paddle | undefined>(undefined)
  const [status, setStatus] = useState<Status>('loading')
  // Set on click (to the list price, the fallback value), used up by the first
  // checkout.loaded after it: one begin_checkout per click.
  const beginCheckoutPending = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      eventCallback(event) {
        // begin_checkout: from the overlay's first load after the click, because only
        // Paddle knows the price after a discount code (FOUNDING50 → 24.5).
        if (event.name === CheckoutEventNames.CHECKOUT_LOADED && beginCheckoutPending.current !== null) {
          const listPrice = beginCheckoutPending.current
          beginCheckoutPending.current = null
          pushConversion({
            event: 'begin_checkout',
            value: event.data?.totals.total ?? listPrice,
            currency: event.data?.currency_code ?? 'USD',
          })
        }
        // Closed without paying: the button works again (it used to stay disabled until a reload).
        if (event.name === CheckoutEventNames.CHECKOUT_CLOSED) {
          setStatus(prev => (prev === 'opening' ? 'idle' : prev))
        }
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          if (event.data) pushPurchase(event.data)
          setStatus('finalizing')
          pollForUnlock(projectId, () => window.location.reload())
        }
      },
    }).then(paddle => {
      if (cancelled) return
      if (paddle) {
        paddleRef.current = paddle
        setStatus('idle')
      } else {
        setStatus('error')
      }
    })

    return () => {
      cancelled = true
    }
  }, [projectId])

  function handleClick() {
    if (status !== 'idle' || !paddleRef.current) return
    setStatus('opening')
    void trackUnlockClick(projectId)
    beginCheckoutPending.current = priceFromLabel(checkout.priceLabel) ?? 49
    paddleRef.current.Checkout.open({
      items: [{ priceId: checkout.priceId, quantity: 1 }],
      // discount_code is for funnel analysis only; Paddle applies and validates discountCode.
      customData: { project_id: projectId, ...(checkout.discountCode && { discount_code: checkout.discountCode }) },
      ...(checkout.discountCode && { discountCode: checkout.discountCode }),
      ...(checkout.customerEmail && { customer: { email: checkout.customerEmail } }),
    })
  }

  const text =
    status === 'opening'
      ? 'Opening checkout…'
      : status === 'loading'
      ? 'Loading checkout…'
      : status === 'error'
        ? 'Checkout unavailable — refresh to retry'
        : status === 'finalizing'
          ? 'Finalizing your unlock…'
          : label

  return (
    <div style={s.wrap}>
      {checkout.discountCode && <p style={s.founding}>{foundingBannerText()}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={status !== 'idle'}
        aria-busy={status === 'opening' || status === 'loading' || status === 'finalizing'}
        className={status === 'opening' || status === 'finalizing' ? 'methea-busy' : undefined}
        style={{ ...s.btn, ...(status === 'opening' || status === 'loading' ? s.btnBusy : {}) }}
      >
        {text}
      </button>
    </div>
  )
}

// GTM purchase conversion. Paddle.js totals.total is in major units (49, not
// 4900): what the customer paid, after any discount code, tax included
// (sandbox FOUNDING50 run: 24.5). The reload after unlock never
// re-fires checkout.completed; the per-transaction key also covers a second tab.
function pushPurchase(data: CheckoutEventsData) {
  const key = `methea_purchase_${data.transaction_id}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    // Storage blocked: still send it once for this page.
  }
  pushConversion({
    event: 'purchase',
    value: data.totals.total,
    currency: data.currency_code ?? 'USD',
    transaction_id: data.transaction_id,
  })
}

// Polls a lightweight status endpoint after checkout.completed fires client-side.
// This never sets paid_at itself — it only waits for the webhook (server-side,
// signature-verified) to have set it, then triggers a reload.
function pollForUnlock(projectId: string, onUnlocked: () => void, attempt = 0) {
  if (attempt > 10) return // ~20s timeout — webhook is slow or failed; user can refresh manually
  fetch(`/api/projects/${projectId}/paid-status`)
    .then(res => res.json())
    .then((data: { paid: boolean }) => {
      if (data.paid) onUnlocked()
      else setTimeout(() => pollForUnlock(projectId, onUnlocked, attempt + 1), 2000)
    })
    .catch(() => setTimeout(() => pollForUnlock(projectId, onUnlocked, attempt + 1), 2000))
}

const s: Record<string, React.CSSProperties> = {
  confirm: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', background: '#FFF6D6', border: '1px solid #EBD98F', borderRadius: 'var(--radius)', padding: '0.75rem 0.875rem' },
  confirmText: { fontSize: '0.875rem', lineHeight: 1.5, color: '#5A4A10' },
  resendBtn: { background: 'none', border: 'none', padding: 0, color: 'var(--ink-blue)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontSize: '0.875rem', fontWeight: 600 },
  btnBusy: { opacity: 0.85, cursor: 'progress' },
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.375rem' },
  founding: { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--moss)', background: 'var(--mint)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' },
  btn: {
    padding: '0.75rem 1.5rem',
    background: 'var(--ink)',
    color: 'var(--sheet)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
  },
}
