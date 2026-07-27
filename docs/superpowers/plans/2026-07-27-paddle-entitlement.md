# Paddle Entitlement + Full-Journey Paywall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the export-only free-count paywall with a real, Paddle-verified, per-project `paid_at` entitlement that gates the full downstream journey (framework narrative, methodology, interview guide, analysis, full export), while keeping brief/Gate 1/theory-suggestions/framework-diagram/diagram-only-export free.

**Architecture:** A single boolean column (`projects.paid_at`) is the source of truth. Every gated server component checks it before doing any expensive generation. Paddle.js (client) opens a hosted checkout carrying `project_id` as `customData`; a Paddle webhook (server, signature-verified, service-role DB write) is the *only* thing that ever sets `paid_at` — the client never writes it directly.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + `@supabase/supabase-js` service-role client), `@paddle/paddle-js` (client checkout), `@paddle/paddle-node-sdk` (webhook signature verification), Vitest (new — for the pure-logic pieces only; this codebase has no existing test runner).

## Global Constraints

- Pricing: **$49 per project, one-time**, no monthly tier. Entitlement is per-project, not per-account.
- Theory-suggestion quality/quantity must never be reduced for free users — do not touch `lib/prompts/theories.ts` or the theories page's suggestion logic in this plan.
- **No blur-leak:** the framework narrative + citations must never be sent to an unpaid client, not even styled as hidden/blurred. Only generate them when `isProjectPaid` is true.
- Free export = Research Question + Theories + Framework Diagram only, watermarked `"Created with Methea · methea.app"`, unlimited (no counter). Paid export = full content, no watermark.
- `paid_at` is written **only** by the verified webhook (`app/api/paddle/webhook/route.ts`), never by any client-side code path.
- The database migration (Task 1) is written and applied to a **Supabase development branch** first. It is **not** applied to prod as part of this plan — that requires the user's explicit go-ahead, tracked as a separate, clearly-marked final task.
- No auto-revoke on Paddle refund events in this iteration — acknowledge (200) and no-op.
- Follow the codebase's existing verification convention (`npx tsc --noEmit` + `npm run build` after every task) since there is no existing UI/integration test setup — introducing one is out of scope beyond the narrowly-scoped Vitest unit tests in Task 0.

---

## Task 0: Add Vitest for the new pure-logic modules

This codebase has zero test infrastructure today. Rather than retrofitting broad test coverage (a bigger, separate decision), this task adds a minimal Vitest setup scoped to the new pure functions this feature introduces (`isProjectPaid`, webhook signature/payload handling) — the parts that are genuinely unit-testable without a live DB or live Paddle account. React components and server-component pages continue to be verified via `tsc`/`build`/manual checks, matching the rest of this codebase.

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `devDependencies` + a `test` script)

**Interfaces:**
- Produces: `npm test` command, runnable by every later task in this plan that includes a unit test.

- [ ] **Step 1: Install Vitest**

Run: `npm install --save-dev vitest`

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
})
```

- [ ] **Step 3: Add the test script**

Modify `package.json` — add `"test": "vitest run"` to `"scripts"`:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Write a trivial smoke test to confirm the runner works**

Create `lib/__smoke__.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: `1 passed`

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm lib/__smoke__.test.ts
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest for entitlement/webhook unit tests"
```

---

## Task 1: `paid_at` data model — type + migration (dev branch only)

**Files:**
- Modify: `types/database.ts` (the `Project` interface)
- Create: `docs/superpowers/plans/2026-07-27-paddle-migration.sql` (the migration, kept as a plan artifact — applied via Supabase MCP tooling, not a CLI migration file, matching this repo's existing convention of a single `supabase/schema.sql` kept in sync with prod)

**Interfaces:**
- Produces: `Project.paid_at: string | null`, `Project.paddle_transaction_id: string | null` — consumed by `lib/entitlement.ts` (Task 2) and every gated `page.tsx` (Tasks 6–9, 11).

- [ ] **Step 1: Add the columns to the `Project` type**

Modify `types/database.ts` — find the `Project` interface (currently ends around line 147):

```ts
export interface Project {
  id: string
  user_id: string
  title: string
  status: ProjectStatus
  research_context: ResearchContext
  context_version: number
  created_at: string
  updated_at: string
}
```

Change to:

```ts
export interface Project {
  id: string
  user_id: string
  title: string
  status: ProjectStatus
  research_context: ResearchContext
  context_version: number
  paid_at: string | null
  paddle_transaction_id: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Verify the type change compiles**

Run: `npx tsc --noEmit`
Expected: no new errors (existing code that does `project as Project` and doesn't reference the new fields is unaffected — they're just additional optional-shaped fields on an already-cast type).

- [ ] **Step 3: Write the migration SQL as a plan artifact**

Create `docs/superpowers/plans/2026-07-27-paddle-migration.sql`:

```sql
-- Paddle entitlement — run on a Supabase development branch first.
-- Do NOT run against prod until the user has explicitly approved (see Task 15).

alter table public.projects
  add column paid_at timestamptz null,
  add column paddle_transaction_id text null;

comment on column public.projects.paid_at is
  'Set by the Paddle webhook when a $49 one-time payment for this project is verified. NULL = free/unpaid.';
```

- [ ] **Step 4: Apply it to a Supabase development branch**

Use the Supabase MCP tooling to create a development branch off the `methea-app` project, then apply this SQL via `apply_migration` against that branch (not prod). Confirm with `list_tables`/`execute_sql` (`select paid_at, paddle_transaction_id from projects limit 1;`) that both columns exist and are nullable.

- [ ] **Step 5: Commit the type change and the migration artifact**

```bash
git add types/database.ts docs/superpowers/plans/2026-07-27-paddle-migration.sql
git commit -m "feat: add paid_at/paddle_transaction_id to Project type + migration"
```

Note: `supabase/schema.sql` is **not** updated in this task — it's updated once the migration is confirmed on prod (Task 15), matching how the `research_context_versions` RLS fix was handled earlier in this project's history (branch/prod-apply first, `schema.sql` sync afterward).

---

## Task 2: Entitlement helper

**Files:**
- Create: `lib/entitlement.ts`
- Test: `lib/entitlement.test.ts`

**Interfaces:**
- Consumes: `Project.paid_at` (Task 1).
- Produces: `isProjectPaid(project: Pick<Project, 'paid_at'>): boolean` — consumed by every gated page (Tasks 6, 7, 8, 9, 11) and the dashboard (Task 12).

- [ ] **Step 1: Write the failing test**

Create `lib/entitlement.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isProjectPaid } from './entitlement'

describe('isProjectPaid', () => {
  it('returns false when paid_at is null', () => {
    expect(isProjectPaid({ paid_at: null })).toBe(false)
  })

  it('returns true when paid_at is a timestamp', () => {
    expect(isProjectPaid({ paid_at: '2026-07-27T12:00:00.000Z' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- entitlement`
Expected: FAIL — `Cannot find module './entitlement'`

- [ ] **Step 3: Implement**

Create `lib/entitlement.ts`:

```ts
import type { Project } from '@/types/database'

export function isProjectPaid(project: Pick<Project, 'paid_at'>): boolean {
  return project.paid_at !== null
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- entitlement`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/entitlement.ts lib/entitlement.test.ts
git commit -m "feat: add isProjectPaid entitlement helper"
```

---

## Task 3: `UnlockButton` — Paddle checkout trigger

**Files:**
- Create: `components/paywall/UnlockButton.tsx`
- Modify: `.env.local.example` (create if it doesn't exist — check first; this repo currently has `.env.local` gitignored with no example file present, confirm with `ls .env.local.example` before assuming)
- Modify: `package.json` (add `@paddle/paddle-js`)

**Interfaces:**
- Consumes: `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT`, `NEXT_PUBLIC_PADDLE_PRICE_ID` env vars.
- Produces: `<UnlockButton projectId={string} />` — consumed by `PaywallLock` (Task 4), the framework locked state (Task 9), and the dashboard (Task 12).

- [ ] **Step 1: Install the Paddle client SDK**

Run: `npm install @paddle/paddle-js`

- [ ] **Step 2: Check whether `.env.local.example` exists**

Run: `ls -la .env.local.example 2>/dev/null || echo "does not exist"`

- [ ] **Step 3: Create or extend `.env.local.example`**

If it doesn't exist, create it with:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Paddle — sandbox values for local dev; production values only in Vercel Production
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_PRICE_ID=
PADDLE_WEBHOOK_SECRET=
```

If it already exists, append only the Paddle block above (don't duplicate existing keys — read the file first and merge by hand).

- [ ] **Step 4: Write `UnlockButton`**

Create `components/paywall/UnlockButton.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'

interface Props {
  projectId: string
  label?: string
}

export default function UnlockButton({ projectId, label = 'Unlock this project — $49 →' }: Props) {
  const paddleRef = useRef<Paddle | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'opening' | 'finalizing'>('idle')

  useEffect(() => {
    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      eventCallback(event) {
        if (event.name === 'checkout.completed') {
          setStatus('finalizing')
          pollForUnlock(projectId, () => window.location.reload())
        }
      },
    }).then(paddle => {
      paddleRef.current = paddle
    })
  }, [projectId])

  function handleClick() {
    if (!paddleRef.current) return
    setStatus('opening')
    paddleRef.current.Checkout.open({
      items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID!, quantity: 1 }],
      customData: { project_id: projectId },
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={status !== 'idle'} style={s.btn}>
      {status === 'finalizing' ? 'Finalizing your unlock…' : label}
    </button>
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
```

Note: this references a `/api/projects/[id]/paid-status` route that doesn't exist yet — that's Task 3a below (small, needed for the polling to work).

- [ ] **Step 5: Create the paid-status polling endpoint**

Create `app/api/projects/[id]/paid-status/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isProjectPaid } from '@/lib/entitlement'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ paid: false }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('paid_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ paid: false }, { status: 404 })

  return NextResponse.json({ paid: isProjectPaid(project) })
}
```

This uses the normal session-scoped client (not service-role) — RLS already restricts it to the caller's own project, which is exactly what we want here.

- [ ] **Step 6: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds; note a new route `ƒ /api/projects/[id]/paid-status` appears in the build output.

- [ ] **Step 7: Commit**

```bash
git add components/paywall/UnlockButton.tsx app/api/projects/ package.json package-lock.json .env.local.example
git commit -m "feat: add UnlockButton (Paddle checkout) + paid-status polling endpoint"
```

---

## Task 4: `PaywallLock` — locked page component

**Files:**
- Create: `components/paywall/PaywallLock.tsx`

**Interfaces:**
- Consumes: `UnlockButton` (Task 3).
- Produces: `<PaywallLock projectId={string} title={string} description={string} />` — consumed by methodology/interview-guide/analysis/export pages (Tasks 6, 7, 8, 11).

- [ ] **Step 1: Write the component**

Create `components/paywall/PaywallLock.tsx`:

```tsx
import Logo from '@/components/ui/Logo'
import UnlockButton from './UnlockButton'

interface Props {
  projectId: string
  title: string
  description: string
}

export default function PaywallLock({ projectId, title, description }: Props) {
  return (
    <main style={s.page}>
      <div style={s.container}>
        <Logo size="sm" />
        <div style={s.card}>
          <p style={s.eyebrow}>Unlock this project</p>
          <h1 style={s.heading}>{title}</h1>
          <p style={s.description}>{description}</p>
          <UnlockButton projectId={projectId} />
          <a href={`/project/${projectId}`} style={s.backLink}>← Back to project</a>
        </div>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', padding: '3rem 1rem', background: 'var(--paper)' },
  container:   { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' },
  card:        { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' },
  eyebrow:     { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pencil)' },
  heading:     { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.02em' },
  description: { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.65 },
  backLink:    { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none', marginTop: '0.5rem' },
}
```

- [ ] **Step 2: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/paywall/PaywallLock.tsx
git commit -m "feat: add PaywallLock component"
```

---

## Task 5: Service-role Supabase client (for the webhook)

**Files:**
- Create: `lib/supabase/service-role.ts`

**Interfaces:**
- Consumes: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` env vars.
- Produces: `createServiceRoleClient(): SupabaseClient` — consumed only by the webhook route (Task 13). **Never import this from any client-rendered code path or any route that isn't the webhook.**

- [ ] **Step 1: Write the client**

Create `lib/supabase/service-role.ts`:

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS entirely. Use ONLY in trusted
 * server-to-server contexts with no user session (e.g. the Paddle webhook).
 * Never expose this client or the underlying key to any client-rendered code.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/service-role.ts
git commit -m "feat: add service-role Supabase client for webhook use"
```

---

## Task 6: Gate the methodology page

**Files:**
- Modify: `app/project/[id]/methodology/page.tsx`

**Interfaces:**
- Consumes: `isProjectPaid` (Task 2), `PaywallLock` (Task 4).

- [ ] **Step 1: Add the paid check before generation**

Modify `app/project/[id]/methodology/page.tsx` — current lines 24–41:

```ts
  const p = project as Project
  const ctx = p.research_context

  // Guard: must have framework before methodology
  if (!ctx?.framework?.edges?.length) redirect(`/project/${params.id}/framework`)

  // Load selected theories
  const { data: theories } = await supabase
    .from('theories')
    .select('*')
    .in('id', ctx.theories!.selected_ids)

  const selectedTheories = (theories ?? []) as Theory[]

  // Use saved chain if available, otherwise generate
  const chain = ctx.methodology?.narrative
    ? ctx.methodology as unknown as import('@/lib/prompts/methodology').MethodologyChain
    : await generateMethodologyChain(ctx, selectedTheories)
```

Change to:

```ts
  const p = project as Project
  const ctx = p.research_context

  // Guard: must have framework before methodology
  if (!ctx?.framework?.edges?.length) redirect(`/project/${params.id}/framework`)

  // Paid-only step — no generation happens for unpaid projects
  if (!isProjectPaid(p)) {
    return (
      <PaywallLock
        projectId={params.id}
        title="Your methodology chain is ready to build"
        description="Unlock this project to get your full paradigm-to-analysis methodology chain, each choice explained, plus the interview guide and transcript analysis that follow it."
      />
    )
  }

  // Load selected theories
  const { data: theories } = await supabase
    .from('theories')
    .select('*')
    .in('id', ctx.theories!.selected_ids)

  const selectedTheories = (theories ?? []) as Theory[]

  // Use saved chain if available, otherwise generate
  const chain = ctx.methodology?.narrative
    ? ctx.methodology as unknown as import('@/lib/prompts/methodology').MethodologyChain
    : await generateMethodologyChain(ctx, selectedTheories)
```

- [ ] **Step 2: Add the imports**

Modify `app/project/[id]/methodology/page.tsx` — top of file, current lines 1–6:

```ts
import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import { generateMethodologyChain } from '@/lib/prompts/methodology'
import MethodologyChainView from './MethodologyChain'
import type { Project, Theory } from '@/types/database'
```

Change to:

```ts
import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import { generateMethodologyChain } from '@/lib/prompts/methodology'
import { isProjectPaid } from '@/lib/entitlement'
import PaywallLock from '@/components/paywall/PaywallLock'
import MethodologyChainView from './MethodologyChain'
import type { Project, Theory } from '@/types/database'
```

- [ ] **Step 3: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/project/\[id\]/methodology/page.tsx
git commit -m "feat: gate methodology page behind paid entitlement"
```

---

## Task 7: Gate the interview-guide page

**Files:**
- Modify: `app/project/[id]/interview-guide/page.tsx`

**Interfaces:**
- Consumes: `isProjectPaid` (Task 2), `PaywallLock` (Task 4).

- [ ] **Step 1: Add the paid check before the ethics checkpoint**

The paid check must come **before** the existing ethics-checkpoint gate — an unpaid user shouldn't see the ethics checkbox for a feature they can't use yet.

Modify `app/project/[id]/interview-guide/page.tsx` — current lines 25–41:

```ts
  const p = project as Project
  const ctx = p.research_context

  // Guard: must have methodology before interview guide
  if (!ctx?.methodology?.narrative) redirect(`/project/${params.id}/methodology`)

  // Ethics checkpoint — must confirm before generating guide
  if (!ctx.ethics_confirmed) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Logo size="sm" />
          <EthicsCheckpoint projectId={params.id} />
        </div>
      </main>
    )
  }
```

Change to:

```ts
  const p = project as Project
  const ctx = p.research_context

  // Guard: must have methodology before interview guide
  if (!ctx?.methodology?.narrative) redirect(`/project/${params.id}/methodology`)

  // Paid-only step — checked before the ethics checkpoint so unpaid users
  // don't see a checkpoint for a feature they can't use yet
  if (!isProjectPaid(p)) {
    return (
      <PaywallLock
        projectId={params.id}
        title="Your interview guide is ready to build"
        description="Unlock this project to generate 10-15 interview questions, each tagged to a framework concept, plus transcript analysis."
      />
    )
  }

  // Ethics checkpoint — must confirm before generating guide
  if (!ctx.ethics_confirmed) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Logo size="sm" />
          <EthicsCheckpoint projectId={params.id} />
        </div>
      </main>
    )
  }
```

- [ ] **Step 2: Add the imports**

Modify `app/project/[id]/interview-guide/page.tsx` — current lines 1–7:

```ts
import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import { generateInterviewGuide } from '@/lib/prompts/interview'
import InterviewGuideView from './InterviewGuide'
import EthicsCheckpoint from './EthicsCheckpoint'
import type { Project, Theory } from '@/types/database'
```

Change to:

```ts
import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import { generateInterviewGuide } from '@/lib/prompts/interview'
import { isProjectPaid } from '@/lib/entitlement'
import PaywallLock from '@/components/paywall/PaywallLock'
import InterviewGuideView from './InterviewGuide'
import EthicsCheckpoint from './EthicsCheckpoint'
import type { Project, Theory } from '@/types/database'
```

- [ ] **Step 3: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/project/\[id\]/interview-guide/page.tsx
git commit -m "feat: gate interview-guide page behind paid entitlement"
```

---

## Task 8: Gate the analysis page

**Files:**
- Modify: `app/project/[id]/analysis/page.tsx`

**Interfaces:**
- Consumes: `isProjectPaid` (Task 2), `PaywallLock` (Task 4).

- [ ] **Step 1: Add the paid check before rendering upload/findings**

Modify `app/project/[id]/analysis/page.tsx` — current lines 14–24:

```ts
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, research_context')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/projects')

  const ctx = project.research_context
  const findings = ctx?.findings
```

Change to:

```ts
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, research_context, paid_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/projects')

  if (!isProjectPaid(project)) {
    return (
      <PaywallLock
        projectId={params.id}
        title="Transcript analysis is ready to unlock"
        description="Unlock this project to upload interview transcripts — Methea codes them against your framework and surfaces themes with supporting quotes."
      />
    )
  }

  const ctx = project.research_context
  const findings = ctx?.findings
```

- [ ] **Step 2: Add the imports**

Modify `app/project/[id]/analysis/page.tsx` — current lines 1–5:

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/ui/Logo'
import UploadForm from './UploadForm'
import FindingsView from './FindingsView'
```

Change to:

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/ui/Logo'
import { isProjectPaid } from '@/lib/entitlement'
import PaywallLock from '@/components/paywall/PaywallLock'
import UploadForm from './UploadForm'
import FindingsView from './FindingsView'
```

- [ ] **Step 3: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/project/\[id\]/analysis/page.tsx
git commit -m "feat: gate analysis page behind paid entitlement"
```

---

## Task 9: Framework page — diagram-free-teaser, narrative paid-only, no blur-leak

This is the most involved page change: the diagram (theories + connections) stays free; the narrative + citations are only generated and only sent to the client when paid.

**Files:**
- Modify: `app/project/[id]/framework/page.tsx`
- Modify: `app/project/[id]/framework/FrameworkBuilder.tsx`

**Interfaces:**
- Consumes: `isProjectPaid` (Task 2), `UnlockButton` (Task 3).
- Produces: `FrameworkBuilder`'s new `locked: boolean` prop and optional `narrative`/`citations`/`citationStatuses` — the paid `page.tsx` still passes all fields; the unpaid path now passes `locked={true}` and omits narrative/citations from generation entirely (not just from props — see Step 1).

- [ ] **Step 1: Split narrative/citation generation behind the paid check**

Modify `app/project/[id]/framework/page.tsx` — current lines 40–74 (the generation block):

```ts
  // Use saved framework if available, otherwise generate
  let edges = ctx.framework?.edges ?? []
  let narrativeResult = {
    narrative: ctx.framework?.narrative ?? '',
    citations: ctx.framework?.citations ?? [],
  }
  let citationStatuses: Record<string, 'doi_verified' | 'classic_verified' | 'unverified'> =
    ctx.framework?.citation_statuses ?? {}

  if (!edges.length) {
    edges = await generateRelationshipLabels(ctx, theories)
    narrativeResult = await generateFrameworkNarrative(ctx, theories, edges)

    await Promise.all(
      narrativeResult.citations.map(async (c) => {
        const key = `${c.author}, ${c.year}`
        if (c.doi) {
          try {
            const res = await fetch(
              `https://api.openalex.org/works/doi:${encodeURIComponent(c.doi)}?mailto=bermet.ak@gmail.com`,
              { next: { revalidate: 86400 } }
            )
            const data = await res.json()
            citationStatuses[key] = data?.doi ? 'doi_verified' : 'unverified'
          } catch {
            citationStatuses[key] = 'unverified'
          }
        } else if (c.year < 1995) {
          citationStatuses[key] = 'classic_verified'
        } else {
          citationStatuses[key] = 'unverified'
        }
      })
    )
  }
```

Change to:

```ts
  const paid = isProjectPaid(p)

  // Diagram (edges) is the free teaser — always generate/keep it.
  let edges = ctx.framework?.edges ?? []
  if (!edges.length) {
    edges = await generateRelationshipLabels(ctx, theories)
    // Persist the diagram immediately so it's not regenerated on every free view.
    await saveFrameworkEdgesOnly(params.id, edges, ctx)
  }

  // Narrative + citations are paid-only. Not generated, not fetched, not sent
  // to the client at all when unpaid — a blurred placeholder is not enough,
  // the real text must never leave the server for an unpaid project.
  let narrativeResult = {
    narrative: ctx.framework?.narrative ?? '',
    citations: ctx.framework?.citations ?? [],
  }
  let citationStatuses: Record<string, 'doi_verified' | 'classic_verified' | 'unverified'> =
    ctx.framework?.citation_statuses ?? {}

  if (paid && !narrativeResult.narrative) {
    narrativeResult = await generateFrameworkNarrative(ctx, theories, edges)

    await Promise.all(
      narrativeResult.citations.map(async (c) => {
        const key = `${c.author}, ${c.year}`
        if (c.doi) {
          try {
            const res = await fetch(
              `https://api.openalex.org/works/doi:${encodeURIComponent(c.doi)}?mailto=bermet.ak@gmail.com`,
              { next: { revalidate: 86400 } }
            )
            const data = await res.json()
            citationStatuses[key] = data?.doi ? 'doi_verified' : 'unverified'
          } catch {
            citationStatuses[key] = 'unverified'
          }
        } else if (c.year < 1995) {
          citationStatuses[key] = 'classic_verified'
        } else {
          citationStatuses[key] = 'unverified'
        }
      })
    )

    // Persist narrative + citations now that they've been generated for a paid project.
    await updateResearchContext(
      params.id,
      'framework',
      {
        framework: {
          layout_preset: ctx.framework?.layout_preset ?? (theories.length === 2 ? 'linear' : 'hub-and-spoke'),
          edges,
          narrative: narrativeResult.narrative,
          citations: narrativeResult.citations,
          citation_statuses: citationStatuses,
        },
      },
      supabase
    )
  }
```

- [ ] **Step 2: Add the small edges-only save helper**

The diagram needs to persist as soon as it's generated for a free user (so it isn't regenerated — and re-billed in Claude tokens — on every page view). Add this to `app/project/[id]/framework/page.tsx`, right after the imports and before the default export:

```ts
async function saveFrameworkEdgesOnly(
  projectId: string,
  edges: import('@/types/database').FrameworkEdge[],
  ctx: import('@/types/database').ResearchContext
) {
  const supabase = createClient()
  await updateResearchContext(
    projectId,
    'framework',
    {
      framework: {
        layout_preset: ctx.framework?.layout_preset ?? 'hub-and-spoke',
        edges,
        narrative: ctx.framework?.narrative ?? '',
        citations: ctx.framework?.citations ?? [],
        citation_statuses: ctx.framework?.citation_statuses ?? {},
      },
    },
    supabase
  )
}
```

- [ ] **Step 3: Pass `locked` to `FrameworkBuilder` and update imports**

Modify `app/project/[id]/framework/page.tsx` — current lines 1–8 (imports):

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateRelationshipLabels, generateFrameworkNarrative } from '@/lib/prompts/framework'
import Logo from '@/components/ui/Logo'
import FrameworkBuilder from './FrameworkBuilder'
import type { Project, Theory } from '@/types/database'
```

Change to:

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateRelationshipLabels, generateFrameworkNarrative } from '@/lib/prompts/framework'
import { updateResearchContext } from '@/lib/research-context'
import { isProjectPaid } from '@/lib/entitlement'
import Logo from '@/components/ui/Logo'
import FrameworkBuilder from './FrameworkBuilder'
import type { Project, Theory } from '@/types/database'
```

And current lines 87–104 (the render):

```tsx
        <FrameworkBuilder
          projectId={params.id}
          theories={diagramTheories}
          edges={edges}
          narrative={narrativeResult.narrative}
          citations={narrativeResult.citations}
          citationStatuses={citationStatuses}
          defaultLayout={defaultLayout}
        />
```

Change to:

```tsx
        <FrameworkBuilder
          projectId={params.id}
          theories={diagramTheories}
          edges={edges}
          narrative={narrativeResult.narrative}
          citations={narrativeResult.citations}
          citationStatuses={citationStatuses}
          defaultLayout={defaultLayout}
          locked={!paid}
        />
```

- [ ] **Step 4: Add the locked state to `FrameworkBuilder`**

Modify `app/project/[id]/framework/FrameworkBuilder.tsx` — current lines 1–20 (imports + props):

```tsx
'use client'

import { useRef, useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import { saveFramework } from './actions'
import type { FrameworkEdge, FrameworkCitation } from '@/types/database'

type Layout = 'hierarchy' | 'hub-and-spoke' | 'linear'
type CitStatus = 'doi_verified' | 'classic_verified' | 'unverified'

interface Props {
  projectId: string
  theories: DiagramTheory[]
  edges: FrameworkEdge[]
  narrative: string
  citations: FrameworkCitation[]
  citationStatuses: Record<string, CitStatus>
  defaultLayout: Layout
}
```

Change to:

```tsx
'use client'

import { useRef, useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import UnlockButton from '@/components/paywall/UnlockButton'
import { saveFramework } from './actions'
import type { FrameworkEdge, FrameworkCitation } from '@/types/database'

type Layout = 'hierarchy' | 'hub-and-spoke' | 'linear'
type CitStatus = 'doi_verified' | 'classic_verified' | 'unverified'

interface Props {
  projectId: string
  theories: DiagramTheory[]
  edges: FrameworkEdge[]
  narrative: string
  citations: FrameworkCitation[]
  citationStatuses: Record<string, CitStatus>
  defaultLayout: Layout
  locked: boolean
}
```

Modify the function signature (current line 28–30):

```tsx
export default function FrameworkBuilder({
  projectId, theories, edges, narrative, citations, citationStatuses, defaultLayout,
}: Props) {
```

Change to:

```tsx
export default function FrameworkBuilder({
  projectId, theories, edges, narrative, citations, citationStatuses, defaultLayout, locked,
}: Props) {
```

Modify the narrative card + actions block (current lines 134–178):

```tsx
      {/* Narrative */}
      <div style={s.narrativeCard}>
        <p style={s.narrativeLabel}>Framework narrative</p>
        <p style={s.narrativeText}>{narrative}</p>
        <div style={s.citationChips}>
          {citations.map((c, i) => {
            const key      = `${c.author}, ${c.year}`
            const status   = citationStatuses[key] ?? 'unverified'
            const verified = status !== 'unverified'
            return (
              <span key={i} style={s.citationItem} title={c.doi ? `DOI: ${c.doi}` : 'No DOI found — verify manually'}>
                {/* state chip: icon only */}
                <span style={{
                  ...s.stateChip,
                  background: verified ? 'var(--mint)'       : 'var(--paper-deep)',
                  color:      verified ? 'var(--moss)'       : 'var(--pencil)',
                  border:     `1px solid ${verified ? 'var(--marker-green)' : 'var(--stone)'}`,
                }}>
                  {verified ? '✓' : '?'}
                </span>
                {/* provenance label: text only, no icon */}
                <span style={s.citationLabel}>{c.author}, {c.year}</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={s.actions}>
        <button type="button" onClick={handleExportPNG} style={s.secondaryBtn}>
          Export PNG
        </button>
        <button type="button" onClick={handleExportWord} style={s.secondaryBtn}>
          Export Word
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ ...s.primaryBtn, ...(saving ? s.primaryBtnDisabled : {}) }}
        >
          {saving ? 'Saving…' : 'Save framework →'}
        </button>
      </div>
    </div>
  )
}
```

Change to:

```tsx
      {/* Narrative — paid only. The unpaid branch never receives real narrative/
          citation text as props (page.tsx only generates them when paid), so
          there is nothing here to leak even if this branch were inspected. */}
      {locked ? (
        <div style={s.narrativeCard}>
          <p style={s.narrativeLabel}>Framework narrative</p>
          <p style={s.lockedPlaceholder}>
            Unlock this project to see the full verified narrative — how your theories connect,
            with citations checked against OpenAlex/CrossRef.
          </p>
          <UnlockButton projectId={projectId} />
        </div>
      ) : (
        <div style={s.narrativeCard}>
          <p style={s.narrativeLabel}>Framework narrative</p>
          <p style={s.narrativeText}>{narrative}</p>
          <div style={s.citationChips}>
            {citations.map((c, i) => {
              const key      = `${c.author}, ${c.year}`
              const status   = citationStatuses[key] ?? 'unverified'
              const verified = status !== 'unverified'
              return (
                <span key={i} style={s.citationItem} title={c.doi ? `DOI: ${c.doi}` : 'No DOI found — verify manually'}>
                  {/* state chip: icon only */}
                  <span style={{
                    ...s.stateChip,
                    background: verified ? 'var(--mint)'       : 'var(--paper-deep)',
                    color:      verified ? 'var(--moss)'       : 'var(--pencil)',
                    border:     `1px solid ${verified ? 'var(--marker-green)' : 'var(--stone)'}`,
                  }}>
                    {verified ? '✓' : '?'}
                  </span>
                  {/* provenance label: text only, no icon */}
                  <span style={s.citationLabel}>{c.author}, {c.year}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions — save/export are paid-only actions */}
      {!locked && (
        <div style={s.actions}>
          <button type="button" onClick={handleExportPNG} style={s.secondaryBtn}>
            Export PNG
          </button>
          <button type="button" onClick={handleExportWord} style={s.secondaryBtn}>
            Export Word
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ ...s.primaryBtn, ...(saving ? s.primaryBtnDisabled : {}) }}
          >
            {saving ? 'Saving…' : 'Save framework →'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add the `lockedPlaceholder` style**

Modify `app/project/[id]/framework/FrameworkBuilder.tsx` — find the `narrativeText` style line (currently around line 193):

```ts
  narrativeText:      { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--graphite)' },
```

Add directly after it:

```ts
  lockedPlaceholder:  { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--pencil)', fontStyle: 'italic' },
```

- [ ] **Step 6: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, sign in, open a project that has completed theory selection but is unpaid (fresh test project, `paid_at` still null). Visit `/project/<id>/framework`.
Expected: diagram renders with real theory boxes/connections; narrative section shows only the italic placeholder + "Unlock this project — $49 →" button; no "Save framework"/"Export" buttons visible. View page source / inspect the React server payload (`view-source:` or the Network tab's HTML response) and confirm the string `Unlock this project` appears but no real narrative sentence does.

- [ ] **Step 8: Commit**

```bash
git add app/project/\[id\]/framework/page.tsx app/project/\[id\]/framework/FrameworkBuilder.tsx
git commit -m "feat: framework page — diagram-only free teaser, narrative paid-only, no blur-leak"
```

---

## Task 10: Export page — free diagram-only vs. paid full export

**Files:**
- Modify: `app/project/[id]/export/page.tsx`
- Modify: `app/project/[id]/export/ExportView.tsx`
- Delete: `app/project/[id]/export/actions.ts` (only contained `incrementExportCount`, no longer needed)

**Interfaces:**
- Consumes: `isProjectPaid` (Task 2), `UnlockButton` (Task 3).
- Produces: `ExportView` gains a `paid: boolean` prop; `exportCount`/`FREE_EXPORT_LIMIT` props/logic are removed entirely.

- [ ] **Step 1: Update the export page to pass `paid` instead of `exportCount`**

Modify `app/project/[id]/export/page.tsx` — full current file:

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExportView from './ExportView'
import type { Project, Theory } from '@/types/database'

export async function generateMetadata() {
  return { title: 'Export proposal — Methea' }
}

export default async function ExportPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  const p   = project as Project
  const ctx = p.research_context

  if (!ctx?.brief) redirect(`/project/${params.id}`)

  const selectedIds = ctx.theories?.selected_ids ?? []

  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year')
    .in('id', selectedIds.length ? selectedIds : ['__none__'])

  return (
    <ExportView
      projectId={params.id}
      ctx={ctx}
      theories={(theories ?? []) as Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]}
      exportCount={ctx.export_count ?? 0}
    />
  )
}
```

Change to:

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isProjectPaid } from '@/lib/entitlement'
import ExportView from './ExportView'
import type { Project, Theory } from '@/types/database'

export async function generateMetadata() {
  return { title: 'Export proposal — Methea' }
}

export default async function ExportPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  const p   = project as Project
  const ctx = p.research_context

  if (!ctx?.brief) redirect(`/project/${params.id}`)

  const selectedIds = ctx.theories?.selected_ids ?? []

  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year')
    .in('id', selectedIds.length ? selectedIds : ['__none__'])

  return (
    <ExportView
      projectId={params.id}
      ctx={ctx}
      theories={(theories ?? []) as Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]}
      paid={isProjectPaid(p)}
    />
  )
}
```

Note: free (unpaid) users can still reach `/export` — a free diagram export is only meaningful once a framework diagram exists (`ctx.framework?.edges?.length`), but we don't hard-redirect if it's missing; `ExportView` conditionally shows an empty state for that case (Step 2).

- [ ] **Step 2: Rewrite `ExportView` for the free/paid split**

Modify `app/project/[id]/export/ExportView.tsx` — current lines 1–45 (imports, constant, props, state):

```tsx
'use client'

import { useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx'
import Logo from '@/components/ui/Logo'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import { incrementExportCount } from './actions'
import type { ResearchContext, Theory } from '@/types/database'

const FREE_EXPORT_LIMIT = Number(process.env.NEXT_PUBLIC_FREE_EXPORT_LIMIT ?? 1)

interface Props {
  projectId: string
  ctx: ResearchContext
  theories: Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]
  exportCount: number
}

export default function ExportView({ projectId, ctx, theories, exportCount }: Props) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [showPolishedModal, setShowPolishedModal] = useState(false)
  const [polishedAcknowledged, setPolishedAcknowledged] = useState(false)
  const [localExportCount, setLocalExportCount] = useState(exportCount)

  const isFreeLimitReached = localExportCount >= FREE_EXPORT_LIMIT

  const theoryMap   = Object.fromEntries(theories.map(t => [t.id, t]))
  const brief       = ctx.brief!
  const framework   = ctx.framework
  const method      = ctx.methodology
  const questions   = ctx.interview_guide?.questions ?? []
  const selectedIds = ctx.theories?.selected_ids ?? []
```

Change to:

```tsx
'use client'

import { useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx'
import Logo from '@/components/ui/Logo'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import UnlockButton from '@/components/paywall/UnlockButton'
import type { ResearchContext, Theory } from '@/types/database'

interface Props {
  projectId: string
  ctx: ResearchContext
  theories: Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]
  paid: boolean
}

export default function ExportView({ projectId, ctx, theories, paid }: Props) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [showPolishedModal, setShowPolishedModal] = useState(false)
  const [polishedAcknowledged, setPolishedAcknowledged] = useState(false)

  const theoryMap   = Object.fromEntries(theories.map(t => [t.id, t]))
  const brief       = ctx.brief!
  const framework   = ctx.framework
  const method      = ctx.methodology
  const questions   = ctx.interview_guide?.questions ?? []
  const selectedIds = ctx.theories?.selected_ids ?? []
```

- [ ] **Step 3: Split `exportScaffold` into a free diagram-only export and remove the count tracking**

Modify `app/project/[id]/export/ExportView.tsx` — current `exportScaffold` function (lines 54–139), which builds the full scaffold and increments the counter unconditionally. Replace it with two functions — one for the free diagram-only export, one for the full paid scaffold (same content as before, minus the counter):

```tsx
  async function exportDiagramOnly() {
    const children: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: 'Created with Methea · methea.app', italics: true, color: 'AAAAAA', size: 16 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({ text: 'Research Framework', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'Research Question', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [new TextRun({ text: brief.research_question, italics: true, size: 24 })], spacing: { after: 120 } }),
      new Paragraph({ children: [new TextRun({ text: 'Topic: ', bold: true }), new TextRun(brief.topic)] }),
      new Paragraph({ children: [new TextRun({ text: 'Degree: ', bold: true }), new TextRun(brief.degree_level)] }),
      new Paragraph({ children: [new TextRun({ text: 'Discipline: ', bold: true }), new TextRun(brief.discipline)], spacing: { after: 300 } }),
    ]

    if (selectedIds.length) {
      children.push(new Paragraph({ text: 'Theoretical Framework', heading: HeadingLevel.HEADING_2 }))
      selectedIds.forEach(id => {
        const t = theoryMap[id]
        if (!t) return
        children.push(
          new Paragraph({ children: [new TextRun({ text: `${t.name} (${t.author}, ${t.year})`, bold: true })], spacing: { after: 60 } }),
        )
      })
      if (framework?.edges?.length) {
        children.push(new Paragraph({
          children: [new TextRun({ text: 'Key relationships: ' + framework.edges.map(e => `${e.from} → ${e.to} (${e.label})`).join('; '), italics: true, color: '7A6F5A', size: 18 })],
          spacing: { after: 160 },
        }))
      }
    }

    const doc  = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'methea-framework-diagram.docx'
    a.click()
  }

  async function exportScaffold() {
    const children: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: 'Created with Methea · methea.app', italics: true, color: 'AAAAAA', size: 16 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({ text: 'Research Proposal Scaffold', heading: HeadingLevel.HEADING_1 }),
      annotation('Complete each section below in your own words. The AI has structured the framework — the interpretation and writing are yours.'),
      new Paragraph({ text: '' }),

      new Paragraph({ text: 'Research Question', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [new TextRun({ text: brief.research_question, italics: true, size: 24 })], spacing: { after: 120 } }),
      new Paragraph({ children: [new TextRun({ text: 'Topic: ', bold: true }), new TextRun(brief.topic)] }),
      new Paragraph({ children: [new TextRun({ text: 'Degree: ', bold: true }), new TextRun(brief.degree_level)] }),
      new Paragraph({ children: [new TextRun({ text: 'Discipline: ', bold: true }), new TextRun(brief.discipline)], spacing: { after: 300 } }),
    ]

    if (selectedIds.length) {
      children.push(
        new Paragraph({ text: 'Theoretical Framework', heading: HeadingLevel.HEADING_2 }),
        annotation('The following theories were selected as the basis for your framework. Explain in your own words why each is relevant to your research question.'),
      )
      selectedIds.forEach(id => {
        const t = theoryMap[id]
        if (!t) return
        children.push(
          new Paragraph({ children: [new TextRun({ text: `${t.name} (${t.author}, ${t.year})`, bold: true })], spacing: { after: 60 } }),
          annotation(`[Write 2–3 sentences explaining how ${t.name} applies to your research context.]`),
        )
      })
      if (framework?.edges?.length) {
        children.push(annotation('Key relationships your framework identified: ' + framework.edges.map(e => `${e.from} → ${e.to} (${e.label})`).join('; ') + '. Describe what these connections mean for your study.'))
      }
      children.push(new Paragraph({ text: '' }))
    }

    if (method) {
      children.push(
        new Paragraph({ text: 'Methodology', heading: HeadingLevel.HEADING_2 }),
        annotation('Your methodology chain is set out below. For each choice, the AI has provided the reasoning — restate it in your own voice and connect it to your specific study.'),
      )
      const chain = [
        { label: 'Research paradigm',  value: method.paradigm,        why: method.paradigm_why },
        { label: 'Methodology',        value: method.methodology,     why: method.methodology_why },
        { label: 'Data collection',    value: method.data_collection, why: method.data_collection_why },
        { label: 'Sample strategy',    value: method.sample,          why: method.sample_why },
        { label: 'Analysis method',    value: method.analysis_method, why: method.analysis_method_why },
      ]
      chain.forEach(item => {
        children.push(
          new Paragraph({ children: [new TextRun({ text: `${item.label}: `, bold: true }), new TextRun(item.value)], spacing: { after: 60 } }),
          annotation(`Rationale: ${item.why} — [Rewrite this in your own words.]`),
        )
      })
      children.push(annotation('[Write your methods paragraph here (120–160 words), integrating the five choices above into a coherent justification.]'))
      children.push(new Paragraph({ text: '' }))
    }

    if (questions.length) {
      children.push(
        new Paragraph({ text: 'Interview Guide', heading: HeadingLevel.HEADING_2 }),
        annotation('These questions were generated from your framework concepts. Review each one — adapt the wording to suit your participants and context.'),
      )
      questions.forEach((q, i) => {
        children.push(
          new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true }), new TextRun(q.question)], spacing: { after: 60 } }),
          new Paragraph({ children: [new TextRun({ text: `Framework concept: ${q.concept} · ${theoryMap[q.theory_id]?.name ?? q.theory_id}`, italics: true, size: 18, color: '7A6F5A' })], spacing: { after: 160 } }),
        )
      })
    }

    const doc  = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'methea-research-scaffold.docx'
    a.click()
  }
```

(This drops the `incrementExportCount` fire-and-forget call and `setLocalExportCount` update that used to follow the download — there's no counter anymore.)

- [ ] **Step 4: Update the header/title area to branch on `paid`**

Modify `app/project/[id]/export/ExportView.tsx` — current lines 201–230 (header + title):

```tsx
        {/* Header */}
        <div style={s.header}>
          <Logo size="sm" />
          <div style={s.headerActions}>
            <a href={`/project/${projectId}`} style={s.backLink}>← Back to project</a>
            <button type="button" onClick={() => setShowPolishedModal(true)} style={s.ghostBtn}>
              Generate polished draft →
            </button>
            {isFreeLimitReached ? (
              <span style={s.upgradeBadge}>
                Upgrade to export again →
              </span>
            ) : (
              <button type="button" onClick={exportScaffold} style={s.exportBtn}>
                Export scaffold (Word)
              </button>
            )}
          </div>
        </div>

        <h1 style={s.pageTitle}>Research Proposal</h1>
        <p style={s.pageSubtitle}>
          {isFreeLimitReached
            ? 'Free plan — 1 export used. Upgrade to export again.'
            : 'Export your research scaffold — then fill in your own analysis and interpretation.'}
        </p>
```

Change to:

```tsx
        {/* Header */}
        <div style={s.header}>
          <Logo size="sm" />
          <div style={s.headerActions}>
            <a href={`/project/${projectId}`} style={s.backLink}>← Back to project</a>
            {paid && (
              <button type="button" onClick={() => setShowPolishedModal(true)} style={s.ghostBtn}>
                Generate polished draft →
              </button>
            )}
            {paid ? (
              <button type="button" onClick={exportScaffold} style={s.exportBtn}>
                Export scaffold (Word)
              </button>
            ) : (
              <button type="button" onClick={exportDiagramOnly} style={s.exportBtn}>
                Export framework diagram (Word)
              </button>
            )}
          </div>
        </div>

        <h1 style={s.pageTitle}>{paid ? 'Research Proposal' : 'Research Framework'}</h1>
        <p style={s.pageSubtitle}>
          {paid
            ? 'Export your research scaffold — then fill in your own analysis and interpretation.'
            : 'Free export includes your research question, theories, and framework diagram, watermarked. Unlock this project for the full proposal scaffold.'}
        </p>
        {!paid && (
          <div style={s.unlockBanner}>
            <p style={s.unlockBannerText}>
              Unlock this project to export the full scaffold — framework narrative, methodology, interview guide, and analysis.
            </p>
            <UnlockButton projectId={projectId} />
          </div>
        )}
```

- [ ] **Step 5: Gate the methodology/interview-guide sections in the document preview by `paid`**

Modify `app/project/[id]/export/ExportView.tsx` — current lines 326–398 (the Methodology and Interview guide `<Section>` blocks). Wrap both in `{paid && (...)}`:

Find:

```tsx
          {/* Methodology */}
          {method?.narrative && (
```

Change to:

```tsx
          {/* Methodology — paid only */}
          {paid && method?.narrative && (
```

Find:

```tsx
          {/* Interview guide */}
          {questions.length > 0 && (
```

Change to:

```tsx
          {/* Interview guide — paid only */}
          {paid && questions.length > 0 && (
```

**This one needs a real fix, not just a check.** The current Framework section (lines
309–324) gates the *entire block — diagram included* — on `framework?.narrative`:

```tsx
          {/* Framework */}
          {framework?.narrative && (
            <>
              <HR />
              <Section label="Conceptual framework">
                {framework.edges?.length > 0 && (
                  <FrameworkDiagram
                    theories={diagramTheories}
                    edges={framework.edges}
                    layout="linear"
                  />
                )}
                <p style={s.narrative}>{framework.narrative}</p>
              </Section>
            </>
          )}
```

Since Task 9 makes `framework.narrative` empty for unpaid projects, this would hide the
diagram too — the opposite of what's needed (diagram is the free content; narrative is
paid). Change the outer gate to `edges?.length` (present for both tiers) and gate only the
narrative paragraph on `paid`:

```tsx
          {/* Framework — diagram is free, narrative is paid-only */}
          {framework?.edges?.length > 0 && (
            <>
              <HR />
              <Section label="Conceptual framework">
                <FrameworkDiagram
                  theories={diagramTheories}
                  edges={framework.edges}
                  layout="linear"
                />
                {paid && framework.narrative && (
                  <p style={s.narrative}>{framework.narrative}</p>
                )}
              </Section>
            </>
          )}
```

- [ ] **Step 6: Add the `unlockBanner` styles**

Modify `app/project/[id]/export/ExportView.tsx` — find `upgradeBadge` in the styles object (currently line 446) and replace it (it's no longer used):

```ts
  upgradeBadge: { padding: '0.5rem 1rem', background: 'var(--marker-yellow)', color: 'var(--warn-text)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const },
```

Change to:

```ts
  unlockBanner:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', background: 'var(--ink)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' as const },
  unlockBannerText: { fontSize: '0.875rem', color: 'var(--sheet)', lineHeight: 1.5, flex: 1, minWidth: '200px' },
```

- [ ] **Step 7: Delete the now-unused `actions.ts`**

```bash
rm "app/project/[id]/export/actions.ts"
```

- [ ] **Step 8: Remove `NEXT_PUBLIC_FREE_EXPORT_LIMIT` from Vercel/local env docs**

Check whether it's referenced anywhere else:

Run: `grep -rn "FREE_EXPORT_LIMIT" --include="*.ts" --include="*.tsx" --include="*.md" .`
Expected: no matches (it was only ever read in `ExportView.tsx`, now removed).

If a Vercel env var named `NEXT_PUBLIC_FREE_EXPORT_LIMIT` exists in the project settings, it's now dead — note it in your final report as a cleanup item for the user to remove from Vercel manually (this plan doesn't have Vercel dashboard access).

- [ ] **Step 9: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 10: Manual verification**

Run: `npm run dev`. For an unpaid test project with a framework diagram already generated: visit `/export`, confirm the page shows "Research Framework" title, the unlock banner, and an "Export framework diagram (Word)" button; click it and confirm the downloaded doc contains only Research Question / Theories / Framework relationships, watermarked, no methodology/interview-guide content. For a paid test project (manually set `paid_at` via SQL for this check, since the webhook isn't wired until Task 13): confirm the full scaffold export and polished-draft button both appear and work as before, with no watermark and no "1 export" messaging anywhere.

- [ ] **Step 11: Commit**

```bash
git add app/project/\[id\]/export/
git commit -m "feat: export page — free diagram-only vs paid full export, remove export-count machinery"
```

---

## Task 11: Dashboard — `paywalled` status

**Files:**
- Modify: `app/project/[id]/ProjectDashboard.tsx`
- Modify: `app/project/[id]/page.tsx` (pass `paid` down)

**Interfaces:**
- Consumes: `isProjectPaid` (Task 2), `UnlockButton` (Task 3).

- [ ] **Step 1: Pass `paid` from the server page**

Modify `app/project/[id]/page.tsx` — current lines 42–54:

```tsx
  const isComplete =
    !!ctx.methodology?.narrative &&
    !!ctx.interview_guide?.questions?.length &&
    !!ctx.findings?.gate3_completed

  return (
    <ProjectDashboard
      projectId={params.id}
      ctx={ctx}
      theories={selectedTheories}
      isComplete={isComplete}
    />
  )
}
```

Change to:

```tsx
  const isComplete =
    !!ctx.methodology?.narrative &&
    !!ctx.interview_guide?.questions?.length &&
    !!ctx.findings?.gate3_completed

  return (
    <ProjectDashboard
      projectId={params.id}
      ctx={ctx}
      theories={selectedTheories}
      isComplete={isComplete}
      paid={isProjectPaid(p)}
    />
  )
}
```

Add the import — modify current line 4:

```tsx
import type { Project, Theory } from '@/types/database'
```

Change to:

```tsx
import { isProjectPaid } from '@/lib/entitlement'
import type { Project, Theory } from '@/types/database'
```

- [ ] **Step 2: Add `paid` to `ProjectDashboard`'s props and extend `CardStatus`**

Modify `app/project/[id]/ProjectDashboard.tsx` — current lines 1–27 (imports + props + component start):

```tsx
'use client'

import { useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import Logo from '@/components/ui/Logo'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import type { ResearchContext, Theory } from '@/types/database'

// ── Accent palette per section ────────────────────────────────────────────────
const ACCENT = {
  question:    '#11425D',
  framework:   '#5C4E9A',
  methodology: '#B55C38',
  guide:       '#2E7D4F',
  analysis:    '#8C8A82',
}

// Spine dot width + gap from left edge of card
const SPINE_W = 32   // total left column width
const DOT_TOP = 36   // px from card top to dot center (aligns with title)

interface Props {
  projectId: string
  ctx: ResearchContext
  theories: Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]
  isComplete: boolean
}

export default function ProjectDashboard({ projectId, ctx, theories, isComplete }: Props) {
```

Change to:

```tsx
'use client'

import { useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import Logo from '@/components/ui/Logo'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import UnlockButton from '@/components/paywall/UnlockButton'
import type { ResearchContext, Theory } from '@/types/database'

// ── Accent palette per section ────────────────────────────────────────────────
const ACCENT = {
  question:    '#11425D',
  framework:   '#5C4E9A',
  methodology: '#B55C38',
  guide:       '#2E7D4F',
  analysis:    '#8C8A82',
}

// Spine dot width + gap from left edge of card
const SPINE_W = 32   // total left column width
const DOT_TOP = 36   // px from card top to dot center (aligns with title)

interface Props {
  projectId: string
  ctx: ResearchContext
  theories: Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]
  isComplete: boolean
  paid: boolean
}

export default function ProjectDashboard({ projectId, ctx, theories, isComplete, paid }: Props) {
```

- [ ] **Step 3: Extend `CardStatus` and compute `'paywalled'` for the gated cards**

Modify `app/project/[id]/ProjectDashboard.tsx` — current lines 113–120:

```tsx
  // ── Card definitions (status drives spine dot color) ──────────────────────────
  type CardStatus = 'done' | 'outdated' | 'locked' | 'empty'
  const outdated = new Set(ctx.outdated_blocks ?? [])
  const qStatus:  CardStatus = 'done'
  const fwStatus: CardStatus = frameworkDone   ? (outdated.has('framework')   ? 'outdated' : 'done') : 'empty'
  const mStatus:  CardStatus = methodologyDone ? (outdated.has('methodology') ? 'outdated' : 'done') : frameworkDone   ? 'empty' : 'locked'
  const igStatus: CardStatus = interviewDone   ? (outdated.has('interview_guide') ? 'outdated' : 'done') : methodologyDone ? 'empty' : 'locked'
  const anStatus: CardStatus = findingsDone ? 'done' : interviewDone ? 'empty' : 'locked'
```

Change to:

```tsx
  // ── Card definitions (status drives spine dot color) ──────────────────────────
  type CardStatus = 'done' | 'outdated' | 'locked' | 'empty' | 'paywalled'
  const outdated = new Set(ctx.outdated_blocks ?? [])
  const qStatus:  CardStatus = 'done'
  const fwStatus: CardStatus = !paid && frameworkDone ? 'paywalled'
    : frameworkDone ? (outdated.has('framework') ? 'outdated' : 'done') : 'empty'
  const mStatus:  CardStatus = !paid && frameworkDone ? 'paywalled'
    : methodologyDone ? (outdated.has('methodology') ? 'outdated' : 'done') : frameworkDone ? 'empty' : 'locked'
  const igStatus: CardStatus = !paid && methodologyDone ? 'paywalled'
    : interviewDone ? (outdated.has('interview_guide') ? 'outdated' : 'done') : methodologyDone ? 'empty' : 'locked'
  const anStatus: CardStatus = !paid && interviewDone ? 'paywalled'
    : findingsDone ? 'done' : interviewDone ? 'empty' : 'locked'
```

- [ ] **Step 4: Add the unlock banner (superseding the "Next step" banner when unpaid)**

Modify `app/project/[id]/ProjectDashboard.tsx` — current lines 144–153:

```tsx
        {/* Banner */}
        {nextHref && (
          <div style={s.banner}>
            <div>
              <p style={s.bannerEyebrow}>Next step</p>
              <p style={s.bannerText}>{nextLabel}</p>
            </div>
            <a href={nextHref} style={s.bannerBtn}>Continue →</a>
          </div>
        )}
```

Change to:

```tsx
        {/* Banner — unlock takes priority over "next step" once theories are selected */}
        {!paid && frameworkDone ? (
          <div style={s.banner}>
            <div>
              <p style={s.bannerEyebrow}>Unlock this project</p>
              <p style={s.bannerText}>Get the full framework narrative, methodology, interview guide, and analysis.</p>
            </div>
            <UnlockButton projectId={projectId} label="Unlock — $49 →" />
          </div>
        ) : nextHref && (
          <div style={s.banner}>
            <div>
              <p style={s.bannerEyebrow}>Next step</p>
              <p style={s.bannerText}>{nextLabel}</p>
            </div>
            <a href={nextHref} style={s.bannerBtn}>Continue →</a>
          </div>
        )}
```

- [ ] **Step 5: Handle the `'paywalled'` status in `SpineRow`'s dot config and `StatusBadge`**

Modify `app/project/[id]/ProjectDashboard.tsx` — current lines 462–467 (`SpineRow`'s `dotCfg`):

```tsx
  const dotCfg = {
    done:     { bg: 'var(--marker-green)',  border: 'none',                      glyph: '✓', glyphColor: 'var(--moss)' },
    outdated: { bg: 'var(--marker-yellow)', border: 'none',                      glyph: '⚠', glyphColor: 'var(--warn-text)' },
    locked:   { bg: 'transparent',          border: '2px solid var(--stone)',    glyph: '○', glyphColor: 'var(--pencil)' },
    empty:    { bg: 'transparent',          border: '2px dashed var(--stone)',   glyph: '',  glyphColor: 'var(--pencil)' },
  }[status]
```

Change to:

```tsx
  const dotCfg = {
    done:      { bg: 'var(--marker-green)',  border: 'none',                      glyph: '✓', glyphColor: 'var(--moss)' },
    outdated:  { bg: 'var(--marker-yellow)', border: 'none',                      glyph: '⚠', glyphColor: 'var(--warn-text)' },
    locked:    { bg: 'transparent',          border: '2px solid var(--stone)',    glyph: '○', glyphColor: 'var(--pencil)' },
    empty:     { bg: 'transparent',          border: '2px dashed var(--stone)',   glyph: '',  glyphColor: 'var(--pencil)' },
    paywalled: { bg: 'transparent',          border: '2px solid var(--ink)',      glyph: '$', glyphColor: 'var(--ink)' },
  }[status]
```

And update the type signature just above it (current line 458–461):

```tsx
function SpineRow({ status, children }: {
  status: 'done' | 'outdated' | 'locked' | 'empty'
  children: React.ReactNode
}) {
```

Change to:

```tsx
function SpineRow({ status, children }: {
  status: 'done' | 'outdated' | 'locked' | 'empty' | 'paywalled'
  children: React.ReactNode
}) {
```

- [ ] **Step 6: Render the paywalled framework card and downstream `LockedCard`s with unlock copy**

Modify `app/project/[id]/ProjectDashboard.tsx` — the Framework `SpineRow` block (current lines 201–247). Find the `{frameworkDone ? ( <SectionCard ...> ) : ( <LockedCard ... /> )}` structure and add a third branch for `fwStatus === 'paywalled'`. Change the opening condition on current line 202:

```tsx
              {frameworkDone ? (
```

Change to:

```tsx
              {fwStatus === 'paywalled' ? (
                <LockedCard
                  accent={ACCENT.framework}
                  kicker="Conceptual framework"
                  title="Preview available"
                  status="paywalled"
                  href={`/project/${projectId}/framework`}
                  ctaLabel="Preview & unlock →"
                  lockedReason="Your framework diagram is ready — unlock this project to see the full verified narrative."
                />
              ) : frameworkDone ? (
```

For the Methodology, Interview guide, and Findings `LockedCard` fallbacks (current lines ~310–321, ~370–381, ~422–436), each currently looks like:

```tsx
                <LockedCard
                  accent={ACCENT.methodology}
                  kicker="Methodology"
                  title="Methodology chain"
                  status={mStatus}
                  href={frameworkDone ? `/project/${projectId}/methodology` : undefined}
                  ctaLabel={frameworkDone ? 'Start methodology →' : undefined}
                  lockedReason={!frameworkDone ? 'Complete framework first' : undefined}
                  derivedFrom={frameworkDone ? { label: selectedIds.map(id => theoryMap[id]?.name ?? id).join(' + '), sourceCardId: 'framework' } : undefined}
                />
```

For each of the three (methodology, interview guide, analysis), add a `status === 'paywalled'` branch that shows `UnlockButton` instead of a next-step link. Concretely, for methodology, change the block to:

```tsx
                mStatus === 'paywalled' ? (
                  <LockedCard
                    accent={ACCENT.methodology}
                    kicker="Methodology"
                    title="Methodology chain"
                    status="paywalled"
                    lockedReason="Unlock this project to get your full paradigm-to-analysis methodology chain."
                    unlockSlot={<UnlockButton projectId={projectId} />}
                  />
                ) : (
                  <LockedCard
                    accent={ACCENT.methodology}
                    kicker="Methodology"
                    title="Methodology chain"
                    status={mStatus}
                    href={frameworkDone ? `/project/${projectId}/methodology` : undefined}
                    ctaLabel={frameworkDone ? 'Start methodology →' : undefined}
                    lockedReason={!frameworkDone ? 'Complete framework first' : undefined}
                    derivedFrom={frameworkDone ? { label: selectedIds.map(id => theoryMap[id]?.name ?? id).join(' + '), sourceCardId: 'framework' } : undefined}
                  />
                )
```

Apply the same pattern (a `<field>Status === 'paywalled' ? <LockedCard ... unlockSlot={<UnlockButton .../>} /> : <existing LockedCard>`) to the interview-guide (`igStatus`) and analysis (`anStatus`) fallback blocks, matching each one's existing `accent`/`kicker`/`title` values.

- [ ] **Step 7: Add `unlockSlot` support and the `paywalled` case to `LockedCard` and `StatusBadge`**

Modify `app/project/[id]/ProjectDashboard.tsx` — current `LockedCard` function (lines 585–621):

```tsx
function LockedCard({ accent, kicker, title, status, href, ctaLabel, lockedReason, locked, derivedFrom }: {
  accent: string; kicker: string; title: string; status?: 'done' | 'outdated' | 'locked' | 'empty'
  href?: string; ctaLabel?: string; lockedReason?: string; locked?: boolean
  derivedFrom?: { label: string; sourceCardId: string }
}) {
  return (
    <div style={{ ...s.card, borderLeftColor: accent, opacity: locked ? 0.55 : 1 }}>
      <div style={{ ...s.cardHeader, cursor: 'default' }}>
        <div style={s.cardHeaderLeft}>
          <p style={{ ...s.kicker, color: accent }}>{kicker}</p>
          <p style={s.title}>{title}</p>
        </div>
        <div style={s.cardHeaderRight}>
          {locked
            ? <span style={s.lockBadge}>🔒 v2</span>
            : status === 'empty'
            ? <StatusBadge status="locked" label="Not started" />
            : <StatusBadge status="locked" />
          }
        </div>
      </div>
      {lockedReason && <p style={s.lockedReason}>{lockedReason}</p>}
      {derivedFrom && (
        <div style={s.derivedFrom}>
          <span style={s.derivedArrow}>↳</span>
          <span style={s.derivedLabel}> derived from: </span>
          <span style={s.derivedValue}>{derivedFrom.label}</span>
        </div>
      )}
      {href && ctaLabel && (
        <div style={s.cardActions}>
          <a href={href} style={{ ...s.actionBtnPrimary, background: accent, borderColor: accent }}>{ctaLabel}</a>
        </div>
      )}
    </div>
  )
}
```

Change to:

```tsx
function LockedCard({ accent, kicker, title, status, href, ctaLabel, lockedReason, locked, derivedFrom, unlockSlot }: {
  accent: string; kicker: string; title: string; status?: 'done' | 'outdated' | 'locked' | 'empty' | 'paywalled'
  href?: string; ctaLabel?: string; lockedReason?: string; locked?: boolean
  derivedFrom?: { label: string; sourceCardId: string }
  unlockSlot?: React.ReactNode
}) {
  return (
    <div style={{ ...s.card, borderLeftColor: accent, opacity: locked ? 0.55 : 1 }}>
      <div style={{ ...s.cardHeader, cursor: 'default' }}>
        <div style={s.cardHeaderLeft}>
          <p style={{ ...s.kicker, color: accent }}>{kicker}</p>
          <p style={s.title}>{title}</p>
        </div>
        <div style={s.cardHeaderRight}>
          {locked
            ? <span style={s.lockBadge}>🔒 v2</span>
            : status === 'paywalled'
            ? <StatusBadge status="paywalled" label="$49 to unlock" />
            : status === 'empty'
            ? <StatusBadge status="locked" label="Not started" />
            : <StatusBadge status="locked" />
          }
        </div>
      </div>
      {lockedReason && <p style={s.lockedReason}>{lockedReason}</p>}
      {derivedFrom && (
        <div style={s.derivedFrom}>
          <span style={s.derivedArrow}>↳</span>
          <span style={s.derivedLabel}> derived from: </span>
          <span style={s.derivedValue}>{derivedFrom.label}</span>
        </div>
      )}
      {unlockSlot && <div style={s.cardActions}>{unlockSlot}</div>}
      {href && ctaLabel && (
        <div style={s.cardActions}>
          <a href={href} style={{ ...s.actionBtnPrimary, background: accent, borderColor: accent }}>{ctaLabel}</a>
        </div>
      )}
    </div>
  )
}
```

Modify `StatusBadge` (current lines 625–632):

```tsx
function StatusBadge({ status, label }: { status: 'done' | 'outdated' | 'locked'; label?: string }) {
  const cfg = {
    done:     { bg: 'var(--mint)',          color: 'var(--moss)',      text: label ?? '✓ Done' },
    outdated: { bg: 'var(--marker-yellow)', color: 'var(--warn-text)', text: label ?? '⚠ Outdated' },
    locked:   { bg: 'var(--paper-deep)',    color: 'var(--pencil)',    text: label ?? '○ Locked' },
  }[status]
  return <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>{cfg.text}</span>
}
```

Change to:

```tsx
function StatusBadge({ status, label }: { status: 'done' | 'outdated' | 'locked' | 'paywalled'; label?: string }) {
  const cfg = {
    done:      { bg: 'var(--mint)',          color: 'var(--moss)',      text: label ?? '✓ Done' },
    outdated:  { bg: 'var(--marker-yellow)', color: 'var(--warn-text)', text: label ?? '⚠ Outdated' },
    locked:    { bg: 'var(--paper-deep)',    color: 'var(--pencil)',    text: label ?? '○ Locked' },
    paywalled: { bg: 'var(--ink)',           color: 'var(--sheet)',     text: label ?? '$ Unlock' },
  }[status]
  return <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>{cfg.text}</span>
}
```

- [ ] **Step 8: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 9: Manual verification**

`npm run dev`, sign in, open an unpaid test project with a framework diagram already generated. Confirm the top banner reads "Unlock this project" with a working `$49` button, the framework card shows a "paywalled" badge with "Preview & unlock →", and methodology/interview-guide/analysis cards show "$49 to unlock" badges with an in-card unlock button.

- [ ] **Step 10: Commit**

```bash
git add app/project/\[id\]/page.tsx app/project/\[id\]/ProjectDashboard.tsx
git commit -m "feat: dashboard paywalled status + unlock banner/CTAs"
```

---

## Task 12: Webhook signature verification (pure logic, unit tested)

**Files:**
- Create: `lib/paddle/verify-webhook.ts`
- Test: `lib/paddle/verify-webhook.test.ts`

**Interfaces:**
- Consumes: `@paddle/paddle-node-sdk`.
- Produces: `verifyPaddleWebhook(rawBody: string, signatureHeader: string, secret: string): PaddleEvent | null` — consumed by the webhook route (Task 13). Returns `null` on invalid signature instead of throwing, so the route can cleanly return 401.

- [ ] **Step 1: Install the Paddle Node SDK**

Run: `npm install @paddle/paddle-node-sdk`

- [ ] **Step 2: Check the SDK's actual verification API before writing code against it**

The exact method name/signature must be confirmed against the installed package's types — do not assume from memory.

Run: `find node_modules/@paddle/paddle-node-sdk -iname "*.d.ts" | xargs grep -l -i "unmarshal\|webhook" | head -5`

Then read whichever file(s) that finds to confirm the exact exported function/class name and its parameters (likely something like a `Paddle` client with a `.webhooks.unmarshal(rawBody, secretKey, signatureHeader)` method, but **confirm the real shape before proceeding** — if it differs from this plan's assumption, adapt Step 3 accordingly and note the deviation in your task summary).

- [ ] **Step 3: Write the failing test**

Create `lib/paddle/verify-webhook.test.ts`. This test doesn't call Paddle's real verification (no network) — it wraps the SDK function and just verifies your wrapper's null-on-failure contract, using an obviously-invalid signature:

```ts
import { describe, it, expect } from 'vitest'
import { verifyPaddleWebhook } from './verify-webhook'

describe('verifyPaddleWebhook', () => {
  it('returns null for an invalid signature', () => {
    const result = verifyPaddleWebhook(
      '{"event_id":"evt_123","event_type":"transaction.completed"}',
      'ts=1;h1=not-a-real-signature',
      'test_secret_key'
    )
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `npm test -- verify-webhook`
Expected: FAIL — `Cannot find module './verify-webhook'`

- [ ] **Step 5: Implement, using whatever the real SDK API turned out to be in Step 2**

Create `lib/paddle/verify-webhook.ts` (adjust the import/call to match the real SDK shape confirmed in Step 2 — this is the best-known shape as of this plan's writing):

```ts
import { Paddle } from '@paddle/paddle-node-sdk'

export function verifyPaddleWebhook(rawBody: string, signatureHeader: string, secret: string) {
  const paddle = new Paddle('unused-api-key-not-needed-for-verification')
  try {
    return paddle.webhooks.unmarshal(rawBody, secret, signatureHeader)
  } catch {
    return null
  }
}
```

- [ ] **Step 6: Run it to confirm it passes**

Run: `npm test -- verify-webhook`
Expected: `1 passed`

- [ ] **Step 7: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/paddle/verify-webhook.ts lib/paddle/verify-webhook.test.ts package.json package-lock.json
git commit -m "feat: add Paddle webhook signature verification wrapper"
```

---

## Task 13: Paddle webhook route

**Files:**
- Create: `app/api/paddle/webhook/route.ts`

**Interfaces:**
- Consumes: `verifyPaddleWebhook` (Task 12), `createServiceRoleClient` (Task 5).
- Produces: `POST /api/paddle/webhook` — the only writer of `projects.paid_at`.

- [ ] **Step 1: Write the route**

Create `app/api/paddle/webhook/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { verifyPaddleWebhook } from '@/lib/paddle/verify-webhook'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('paddle-signature')

  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 })
  }

  const event = verifyPaddleWebhook(rawBody, signature, process.env.PADDLE_WEBHOOK_SECRET!)
  if (!event) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // Only act on a completed one-time payment. Refund events (transaction.payment_refunded,
  // adjustment.created) are intentionally acknowledged with no action — see plan Task 13
  // notes / design spec for why auto-revoke is out of scope for this iteration.
  if (event.eventType === 'transaction.completed') {
    const projectId = event.data.customData?.project_id as string | undefined
    const transactionId = event.data.id as string

    if (!projectId) {
      // Nothing to map this payment to — acknowledge so Paddle doesn't retry forever,
      // but this should never happen if UnlockButton always sends customData correctly.
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
```

- [ ] **Step 2: Verify types and build**

Run: `npx tsc --noEmit`
Expected: no errors — if `event.eventType`/`event.data.customData` don't match the real SDK's returned event shape (confirmed in Task 12 Step 2), adjust the property access here to match.

Run: `npm run build`
Expected: succeeds; `ƒ /api/paddle/webhook` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add app/api/paddle/webhook/
git commit -m "feat: add Paddle webhook route — verifies signature, sets paid_at idempotently"
```

---

## Task 14: Sandbox end-to-end verification (manual, Supabase dev branch + Paddle sandbox)

This task has no code changes — it's a manual checklist proving the whole flow works before touching prod. Do not skip steps or mark this done from inspection alone; each step requires an observed result.

**Files:** none (verification only).

- [ ] **Step 1: Confirm the dev branch has the migration**

Using the Supabase MCP tooling, confirm the development branch created in Task 1 has `paid_at`/`paddle_transaction_id` on `projects` (re-run `execute_sql`: `select paid_at, paddle_transaction_id from projects limit 1;` if not already confirmed).

- [ ] **Step 2: Point local env at the dev branch + Paddle sandbox**

Set in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<dev branch URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev branch anon key>
SUPABASE_SERVICE_ROLE_KEY=<dev branch service role key>
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=<sandbox client token>
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_PRICE_ID=<sandbox $49 price id>
PADDLE_WEBHOOK_SECRET=<sandbox webhook secret>
```

- [ ] **Step 3: Start the app and a public tunnel**

Run: `npm run dev`
In a second terminal: `ngrok http 3000` (or equivalent) — note the public HTTPS URL.

- [ ] **Step 4: Register the sandbox webhook**

In the Paddle dashboard (sandbox mode), add a webhook endpoint pointing at `<ngrok-url>/api/paddle/webhook`, subscribed at minimum to `transaction.completed`.

- [ ] **Step 5: Full flow — free path**

Sign in, create a new project, go through brief → Gate 1 → theory selection → framework page. Confirm the diagram renders and the narrative shows only the locked placeholder + unlock button (per Task 9's manual check). Confirm methodology/interview-guide/analysis all show `PaywallLock`.

- [ ] **Step 6: Full flow — checkout**

Click "Unlock this project — $49" (from the dashboard banner or the framework page). Confirm the Paddle sandbox checkout overlay opens with the correct $49 price. Complete it using a Paddle test card (e.g., their documented `4242...` sandbox test number — confirm the current test card number in Paddle's sandbox docs, since these change).

- [ ] **Step 7: Confirm the webhook fired and persisted correctly**

Check the terminal running `npm run dev` (or Vercel logs if deployed to preview) for the webhook route's response. Then query the dev branch directly: `select paid_at, paddle_transaction_id from projects where id = '<project-id>';` — confirm `paid_at` is set and `paddle_transaction_id` matches the sandbox transaction ID shown in Paddle's dashboard.

- [ ] **Step 8: Confirm the client unlocked**

Confirm the `UnlockButton`'s polling picked up the change and the page reloaded, or manually refresh. Visit methodology/interview-guide/analysis/framework — confirm all now generate and show full content, and export shows the full scaffold with no watermark.

- [ ] **Step 9: Idempotency check**

In the Paddle dashboard, use "resend" on the same webhook event. Confirm the route returns 200 and the DB row is unchanged (no error, no second write — verify `updated_at` on the row, if tracked, didn't change a second time, or simply confirm no error was thrown and `paid_at` is still the original value).

- [ ] **Step 10: Negative case — bad signature**

Run (adjust host/port to match your local server):
```bash
curl -i -X POST http://localhost:3000/api/paddle/webhook \
  -H "paddle-signature: ts=1;h1=deadbeef" \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_fake","event_type":"transaction.completed","data":{"id":"txn_fake","customData":{"project_id":"00000000-0000-0000-0000-000000000000"}}}'
```
Expected: `401`, and confirm via SQL that no project's `paid_at` changed.

- [ ] **Step 11: Report results**

Summarize pass/fail for each step above before proceeding to Task 15 — do not proceed if any step failed.

---

## Task 15: Apply migration to prod (BLOCKED on explicit user approval)

**Do not execute this task until the user has explicitly said to proceed, after reviewing Task 14's results.**

- [ ] **Step 1: Get explicit approval**

Show the user the Task 1 migration SQL again and the Task 14 verification summary. Wait for an explicit "yes, apply to prod" before continuing.

- [ ] **Step 2: Apply to prod**

Once approved, use the Supabase MCP tooling's `apply_migration` against the `methea-app` prod project (kmsrfacqppnckeohesxn) with the same SQL from Task 1, Step 3.

- [ ] **Step 3: Update `supabase/schema.sql` to match**

Add the same `alter table` block to `supabase/schema.sql` in the appropriate place (near the `projects` table definition), matching this repo's established convention of keeping that file in sync with prod after a direct-apply migration.

- [ ] **Step 4: Commit the schema sync**

```bash
git add supabase/schema.sql
git commit -m "docs: sync schema.sql with prod paid_at/paddle_transaction_id migration"
```

- [ ] **Step 5: Get approval for production Paddle credentials**

Ask the user whether to add the production Paddle env vars (`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT=production`, `NEXT_PUBLIC_PADDLE_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`) to Vercel Production now, or hold until they're ready to actually go live with payments. This is a separate decision from applying the migration — the migration is safe/inert with no Paddle credentials wired; going live with production Paddle is a business decision with real money involved.

---

## Task 16: Rollout — pre-existing projects with already-generated paid content

**Blocked on Task 15 being complete (prod migration applied).**

Any project created before this feature shipped may already have a real `framework.narrative`, `methodology`, `interview_guide`, or `findings` in its `research_context` — including the seeded demo project used for professor demos. Once this ships, those would read as locked (since `paid_at` is null) despite the content already existing.

- [ ] **Step 1: Find affected projects**

Run via the Supabase MCP tooling against prod:
```sql
select id, title, paid_at,
  (research_context->'methodology'->>'narrative') is not null as has_methodology,
  (research_context->'interview_guide'->'questions') is not null as has_interview_guide,
  (research_context->'findings') is not null as has_findings
from projects
where paid_at is null
  and (
    (research_context->'methodology'->>'narrative') is not null
    or (research_context->'interview_guide'->'questions') is not null
    or (research_context->'findings') is not null
  );
```

- [ ] **Step 2: Show the results to the user and ask which should be marked paid**

Do not mark any project paid without the user confirming which ones (the demo project should almost certainly be included; other real user projects are the user's call).

- [ ] **Step 3: Apply, once approved**

For each approved project ID:
```sql
update projects set paid_at = now() where id = '<project-id>' and paid_at is null;
```

- [ ] **Step 4: Confirm**

Re-run the Step 1 query filtered to `paid_at is not null` for those IDs to confirm the update took.

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), entitlement helper (Task 2), UnlockButton/PaywallLock (Tasks 3–4), service-role client (Task 5), methodology/interview-guide/analysis gating (Tasks 6–8), framework no-blur-leak (Task 9), export free-diagram/paid-full split (Task 10), dashboard paywalled status (Task 11), webhook signature verification + route (Tasks 12–13), sandbox test plan (Task 14), prod rollout gated on approval (Tasks 15–16) — every section of the design spec has a corresponding task.
- **Type consistency checked:** `isProjectPaid(project: Pick<Project, 'paid_at'>)` signature is used identically in Tasks 6, 7, 8, 9, 10, 11. `FrameworkBuilder`'s new `locked: boolean` prop name is consistent between the Task 9 page.tsx call site and the component definition. `LockedCard`'s new `unlockSlot` prop is defined and consumed consistently in Task 11.
- **No placeholders:** every step has literal code, exact file paths, and exact commands with expected output. The two spots requiring a live check against external docs (Paddle SDK method shape in Task 12 Step 2, webhook event property names in Task 13 Step 2) are called out explicitly as verification steps with instructions on how to check, not asserted as fact — this is deliberate, not a placeholder, since the exact SDK surface can't be verified from within this environment.
- **Bug caught during self-review:** Task 10's Framework section in `ExportView.tsx` originally gated the *entire block, diagram included* on `framework?.narrative` — which is empty for unpaid projects after Task 9, so the diagram (the actual free content) would have been hidden too. Fixed by gating the outer block on `edges?.length` (present for both tiers) and only the narrative paragraph on `paid`.
