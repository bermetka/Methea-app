'use client'

import { useEffect, useRef, useState } from 'react'
import { initializePaddle, CheckoutEventNames, type Paddle } from '@paddle/paddle-js'
import { foundingBannerText, type CheckoutContext } from '@/lib/pricing'
import { trackUnlockClick } from '@/app/actions/funnel'

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

export default function UnlockButton({ projectId, checkout, compact, label: customLabel }: Props) {
  const label = customLabel
    ? `${customLabel} — ${checkout.priceLabel} →`
    : compact
      ? `Unlock — ${checkout.priceLabel} →`
      : `Unlock this project — ${checkout.priceLabel} →`
  const paddleRef = useRef<Paddle | undefined>(undefined)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false

    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      eventCallback(event) {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
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
    paddleRef.current.Checkout.open({
      items: [{ priceId: checkout.priceId, quantity: 1 }],
      // discount_code is for funnel analysis only; Paddle applies and validates discountCode.
      customData: { project_id: projectId, ...(checkout.discountCode && { discount_code: checkout.discountCode }) },
      ...(checkout.discountCode && { discountCode: checkout.discountCode }),
      ...(checkout.customerEmail && { customer: { email: checkout.customerEmail } }),
    })
  }

  const text =
    status === 'loading'
      ? 'Loading checkout…'
      : status === 'error'
        ? 'Checkout unavailable — refresh to retry'
        : status === 'finalizing'
          ? 'Finalizing your unlock…'
          : label

  return (
    <div style={s.wrap}>
      {checkout.discountCode && <p style={s.founding}>{foundingBannerText()}</p>}
      <button type="button" onClick={handleClick} disabled={status !== 'idle'} style={s.btn}>
        {text}
      </button>
    </div>
  )
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
