# Paddle entitlement + full-journey paywall — design spec

_Date: 2026-07-27 · Status: approved, pending implementation plan_

## Goal

Today, the only gate in the product is a free-export-count limit (`FREE_EXPORT_LIMIT`,
`research_context.export_count`) on the export page. This spec replaces that with a real,
Paddle-verified, per-project entitlement (`projects.paid_at`) and moves the paywall boundary
from "export only" to "the full downstream journey" — framework narrative, methodology,
interview guide, analysis, and full export are all paid; brief, Gate 1, theory suggestions,
and a framework diagram preview stay free.

Pricing: **$49 per project, one-time**, via Paddle (merchant of record). No monthly tier.

## Freemium boundary

| Step | Free | Paid |
|---|---|---|
| Brief + Gate 1 | ✅ full | ✅ full |
| Theory suggestions | ✅ full — same quality/quantity as paid, never reduced | ✅ full |
| Framework | Diagram only (real theories + real connections) — the trust teaser. **No narrative, no citations sent to the client at all.** | Diagram + full narrative + verified citations |
| Methodology | 🔒 Locked card, **no generation happens** | ✅ full chain + narrative |
| Interview guide | 🔒 Locked card, **no generation happens** | ✅ full guide |
| Analysis / coding | 🔒 Locked card, **no generation happens** | ✅ full coding + themes |
| Export | Framework-only export (Research Question + Theories + Diagram), watermarked, **unlimited** | Full export (all sections), no watermark |

Two points that were explicitly corrected during design review and must not regress:

1. **No blur-leak.** CSS-blurring the real narrative/citations is not acceptable — the real
   text would still be present in the DOM and in `research_context`, retrievable via
   devtools/view-source. The framework page must not generate or send the narrative/citations
   to an unpaid client at all. What's blurred is a **placeholder** ("Unlock to see the full
   verified narrative"), never real content. This also avoids paying Claude API cost for
   narrative generation for users who never convert.
2. **Free export is not deleted, it's trimmed.** The old `FREE_EXPORT_LIMIT` /
   `export_count` / "1 export" counter machinery goes away entirely, but a free,
   unlimited, watermarked **diagram-only** export stays — it's the growth loop (a student
   shares a Methea-branded diagram with their supervisor). Free export includes: Research
   Question, Theories, Framework Diagram. It excludes: narrative, methodology, interview
   guide, analysis. (If "diagram only" was meant even more literally — no research
   question/theory context at all — flag it; the interpretation above is what's specified
   unless corrected.)

## Data model

```sql
alter table public.projects
  add column paid_at timestamptz null,
  add column paddle_transaction_id text null;

comment on column public.projects.paid_at is
  'Set by the Paddle webhook when a $49 one-time payment for this project is verified. NULL = free/unpaid.';
```

- `paid_at is not null` = paid. No other state machine.
- `paddle_transaction_id` is a small addition beyond the original ask: supports refund/support
  lookups and makes the webhook idempotent (see below).
- No RLS changes needed. The existing `projects` ownership policy
  (`auth.uid() = user_id`, `FOR ALL`) already covers this new column. The webhook writes via a
  service-role client, which bypasses RLS by design (see Webhook section).
- **Rollout order:** apply first to a **Supabase development branch**, verify the full flow
  there (see Test plan), apply to **prod only after explicit user approval**. Never touch prod
  directly as part of implementation.

## Entitlement helper

`lib/entitlement.ts`:

```ts
export function isProjectPaid(project: Pick<Project, 'paid_at'>): boolean {
  return project.paid_at !== null
}
```

A plain function, not a context/provider — this is a single boolean read, no need for more
ceremony.

## UI components

`components/paywall/`:

- **`PaywallLock.tsx`** — full-page locked state used on methodology, interview-guide,
  analysis, and (for the full-export case) export when unpaid. Explains what the step
  unlocks, renders `UnlockButton`. The corresponding `page.tsx` checks `isProjectPaid` **before**
  calling any Claude/OpenAlex generation code, and renders `PaywallLock` instead of doing the
  work — no generation cost is spent on content that won't be shown.
- **`UnlockButton.tsx`** — client component wrapping Paddle.js checkout (see Checkout
  section). Reused on: the dashboard banner, `PaywallLock`, and the framework page's locked
  narrative placeholder. Props: `projectId`. Renders "Unlock this project — $49 →".

## Framework page (`app/project/[id]/framework/`)

- Diagram generation (`generateRelationshipLabels` → `edges`) always happens, paid or not —
  it's the free teaser and is cheap relative to narrative generation.
- Narrative + citation generation (`generateFrameworkNarrative` + the OpenAlex verification
  loop) **only runs when `isProjectPaid(project)` is true**. If unpaid, the page skips this
  entirely — no Claude call, no citation fetches.
- `FrameworkBuilder` gets a new `locked?: boolean` prop:
  - `locked=false` (paid): renders exactly as today — diagram + real narrative + citations +
    save/edit actions.
  - `locked=true` (unpaid): renders the diagram normally (real theories, real connections),
    then a placeholder block ("Unlock to see the full verified narrative") with `UnlockButton`
    overlaid. No save/edit actions available (editing is a paid action).
- Because narrative/citations may now be generated *after* diagram-only in an earlier
  session, `research_context.framework` can be in a partial state (`edges` present,
  `narrative`/`citations` absent) — this is expected and already compatible with the existing
  `frameworkDone = !!framework?.edges?.length` check used elsewhere (dashboard status, export
  gating), since that only checks `edges`.

## Methodology / Interview guide / Analysis pages

Each `page.tsx`:
1. Load project, compute `isProjectPaid(project)`.
2. If **not paid**: render `PaywallLock` immediately. Do not call any generation function.
3. If paid: behave exactly as today (generate-if-missing, then render the real view).

## Export page (`app/project/[id]/export/`)

- No longer a binary paid/locked gate — always reachable, content varies by entitlement:
  - **Unpaid:** renders a trimmed `ExportView` variant containing only Research Question,
    Theories, and Framework Diagram, with the watermark
    `"Created with Methea · methea.app"` on the exported Word doc. Unlimited — no counter.
  - **Paid:** renders the full `ExportView` (all sections: framework narrative, methodology,
    interview guide, analysis), **no watermark**.
- Deleted entirely: `FREE_EXPORT_LIMIT` (env var and constant), `research_context.export_count`,
  `incrementExportCount` action, the "Upgrade to export again" badge/messaging. There is no
  counter in the new model — free export is unlimited by design (diagram-only content is the
  limiter, not a count).
- The "Generate polished draft" button stays paid-only by construction, since it only appears
  in the full (paid) `ExportView` variant.

## Dashboard (`ProjectDashboard.tsx`)

- Extends the existing `CardStatus` union (`'done' | 'outdated' | 'locked' | 'empty'`) with a
  new `'paywalled'` state — additive, not a replacement of the existing prerequisite-lock
  logic.
- When unpaid:
  - Framework card (once theories are selected): status `'paywalled'`, action "Preview &
    unlock →" linking to `/framework` — the rich locked-diagram-plus-placeholder experience
    lives on that page, not duplicated on the dashboard.
  - Methodology / interview-guide / analysis cards: status `'paywalled'`, reusing the existing
    `LockedCard` component with new copy ("Unlock this project — $49" instead of "Complete X
    first") and `UnlockButton` instead of a next-step link.
  - The existing "Next step: Continue →" banner is superseded by an "Unlock this project —
    $49" banner once theories are selected and the project is unpaid — the primary
    conversion moment.
- When paid: dashboard behaves exactly as today. Zero behavior change.

## Paddle checkout (client)

- Package: `@paddle/paddle-js` (Paddle's official JS wrapper), not a hand-loaded CDN script.
- `UnlockButton` initializes:
  ```ts
  Paddle.Initialize({ token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, eventCallback })
  ```
  with `Paddle.Environment.set(...)` driven by `NEXT_PUBLIC_PADDLE_ENVIRONMENT`
  (`'sandbox' | 'production'`).
- On click:
  ```ts
  Paddle.Checkout.open({
    items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID, quantity: 1 }],
    customData: { project_id: projectId },
  })
  ```
  `customData` (Paddle Billing's current term — was `passthrough` in Paddle Classic) is how
  `project_id` rides along to the webhook.
- `eventCallback` on `checkout.completed`: shows an optimistic "Payment received — finalizing
  your unlock…" state and polls a lightweight server check for a few seconds, then refreshes
  once `paid_at` is set. **The client callback never sets `paid_at` itself** — it only
  triggers a re-check. `paid_at` is written exclusively by the webhook (below), since a
  client-side "payment succeeded" signal is trivially spoofable.

## Paddle webhook (server)

`app/api/paddle/webhook/route.ts`:

- Reads the **raw** request body — signature verification requires the exact bytes Paddle
  signed, so the body must not be JSON-parsed first.
- Verifies the signature via `@paddle/paddle-node-sdk` against `PADDLE_WEBHOOK_SECRET`
  (server-only secret). Invalid/missing signature → `401`, no DB write, no further
  processing.
- On the successful-one-time-payment event (`transaction.completed` in current Paddle Billing
  docs as of this writing — **must be re-confirmed against Paddle's live webhook event
  reference during implementation**, not assumed from this spec) — extracts `project_id` from
  `customData` and the transaction ID from the event, then runs (via a **service-role**
  Supabase client):
  ```sql
  update projects
  set paid_at = now(), paddle_transaction_id = $1
  where id = $2 and paid_at is null;
  ```
  The `paid_at is null` guard makes this idempotent — a retried/duplicate Paddle delivery is a
  no-op, not a double-process.
- `SUPABASE_SERVICE_ROLE_KEY` is a **new secret** for this app (first use of service-role
  anywhere in the codebase) — required because a webhook has no user session/cookies to
  authenticate as. Server-only, never `NEXT_PUBLIC_`.
- Unhandled event types: acknowledge with `200`, no action (avoids Paddle retry storms for
  events we don't care about).
- **Refunds: no auto-revoke in this MVP.** The webhook accepts and `200`-acknowledges
  `transaction.payment_refunded` / `adjustment.created` so Paddle stops retrying them, but
  takes no DB action. Revoking a refunded project's access is a manual step (clear `paid_at`
  by hand) until there's real payment volume to justify building auto-revoke (which has to
  handle partial refunds, mid-session revocation, etc.). This is a deliberate, named MVP gap,
  not an oversight.

## Environment variables

| Var | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | client | safe to expose; differs sandbox vs. production |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | client | `'sandbox'` \| `'production'` |
| `NEXT_PUBLIC_PADDLE_PRICE_ID` | client | the $49 one-time price ID |
| `PADDLE_WEBHOOK_SECRET` | server only | signature verification |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | new; webhook DB write |

Sandbox values go in local `.env.local` / Vercel Preview; production values only added to
Vercel Production after the sandbox flow is fully verified and the user approves going live.

## Test plan (Paddle sandbox + Supabase dev branch — nothing touches prod without approval)

1. Create a Supabase development branch; apply the `paid_at` / `paddle_transaction_id`
   migration there first.
2. Point local `.env.local` at the branch DB plus Paddle **sandbox** credentials.
3. Tunnel the local webhook route to a public HTTPS URL (ngrok or similar); register it as the
   sandbox webhook endpoint in Paddle's dashboard.
4. Full flow: new project → brief → Gate 1 → theories → framework (diagram-only preview) →
   click "Unlock — $49" → Paddle sandbox checkout with a test card → confirm webhook fires,
   signature verifies, `paid_at` is set on the branch DB → confirm methodology /
   interview-guide / analysis / full framework narrative / full export all unlock.
5. Idempotency: use Paddle's "resend webhook" to redeliver the same event — confirm no
   duplicate/second write.
6. Negative case: tamper with the signature header — confirm `401`, no DB write.
7. Only after all of the above passes: discuss applying the migration to prod and pointing a
   **production** Paddle webhook at it (separate credentials, separate explicit go-ahead).

## Rollout note

The seeded demo project (used for professor demos) already has a real framework narrative
stored in `research_context`. Once this ships, it will read as unpaid/locked unless `paid_at`
is explicitly set on it. Plan to set `paid_at` on the demo project manually as part of
rollout, so it doesn't break mid-demo.

## Explicitly out of scope for this spec

- Auto-revoking access on refund (named above as a deliberate MVP gap).
- Any monthly/subscription entitlement — this is single-purchase, per-project only.
- Changing theory suggestion quality/quantity between free and paid — explicitly must stay
  identical.
