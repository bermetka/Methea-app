# Editable Plan-flow + Student Theories — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each Plan-layer step (Socratic gate, theory selection, framework) revisable/iterative, let students browse the full curated theory library and add their own verified theories, and add an optional free-text context field to the Socratic gate — reusing the existing `research_context` versioning + `outdated_blocks` soft-invalidation, with zero DB migration.

**Architecture:** All new state lives inside the central versioned `research_context` JSON and is written through the existing `updateResearchContext()` path. Custom (bring-your-own) theories are stored per-project at `research_context.theories.custom_theories[]` with namespaced ids `custom:<uuid>`, and merged with global library rows by a single shared resolver `resolveProjectTheories()` used at all 6 theory-resolution sites. The AI `suggestTheories()` pool stays strictly the global `theories` table (curation integrity). Custom theories are first-class in downstream generation (framework + methodology prompts receive the merged theory set). Each custom theory stores its OpenAlex verification result in JSON so chips are stable and render without re-hitting OpenAlex.

**Tech Stack:** Next.js 14 App Router (server components + server actions), Supabase (jsonb `research_context`), Claude API (structured JSON), OpenAlex REST. TypeScript. No test runner in repo — verification bar per task is **`npx tsc --noEmit` clean + `next build` clean + targeted manual dogfood**.

## Global Constraints

- Single-column layout, `max-width: 720px` (reuse existing `styles.container`). No sidebars.
- Brand tokens only — **NO new colors**. Verified-state vocabulary is fixed:
  - `✓` verified → `background: var(--mint)`, `color: var(--moss)`, border `var(--marker-green)`
  - `?` unverified → `background: var(--stone-soft)`/`var(--paper-deep)`, `color: var(--pencil)`, border `var(--stone)`
  - `⚠` outdated → `background: var(--marker-yellow)`, `color: var(--warn-text)`
- Never present an unverified citation/theory as fact. `?` chip + "verify manually" wording; shown, never hidden.
- Reuse `research_context` versioning via `updateResearchContext()`. Do NOT create a parallel state store. No DB migration.
- AI `suggestTheories()` reads ONLY the global `theories` table — never custom theories.
- Socratic gate stays structured: exactly ONE selected option (single downstream signal) + ONE optional free-text field. No open chat. No free multi-select.
- Theory selection bounds unchanged: `MIN_SELECT = 2`, `MAX_SELECT = 4`.
- Every server write routes through `updateResearchContext(projectId, changedBlock, patch, supabase)`.

---

## File Structure

**New files:**
- `lib/project-theories.ts` — `resolveProjectTheories()` + `newCustomTheoryId()` (the DRY linchpin).

**Modified files:**
- `types/database.ts` — `CustomTheory` type; extend `research_context.theories` (`custom_theories?`, `suggestions?`); add `socratic_gate_1.context_note?`.
- `lib/openalex.ts` — add `verifyCitation()`.
- `lib/prompts/theories.ts` — fold `context_note` into the suggest prompt.
- `app/project/[id]/theories/page.tsx` — persist suggestions, unlock read-only, pass full library, resolve custom theories.
- `app/project/[id]/theories/TheoryCards.tsx` — browse toggle, add-your-own form, editable re-select.
- `app/project/[id]/theories/actions.ts` — `saveTheorySelection` handles custom ids + persists suggestions; new `addCustomTheory` action.
- `app/project/[id]/gate1/page.tsx` — replace hard read-only with editable re-entry.
- `app/project/[id]/gate1/Gate1Form.tsx` — seed saved answers; add optional context textarea.
- `app/project/[id]/gate1/actions.ts` — persist `context_note`; set `outdated_blocks` when answers/context change.
- `app/project/[id]/framework/page.tsx` — regenerate-on-outdated + `[Review changes]` banner; resolve custom theories.
- `app/project/[id]/methodology/page.tsx` — resolve custom theories (merge into theory set).
- `app/project/[id]/interview-guide/page.tsx` — resolve custom theories.
- `app/project/[id]/export/page.tsx` — resolve custom theories.
- `app/project/[id]/page.tsx` (dashboard data) — resolve custom theories.
- `app/project/[id]/analysis/actions.ts` — resolve custom theories.

---

## Task 0: Shared types + resolver + verification helper (foundation)

Everything depends on this. No UI yet.

**Files:**
- Modify: `types/database.ts`
- Create: `lib/project-theories.ts`
- Modify: `lib/openalex.ts`

**Interfaces produced (later tasks rely on these exact signatures):**
- `CustomTheory` interface (see below).
- `resolveProjectTheories(ctx: ResearchContext, selectedIds: string[], supabase: SupabaseClient): Promise<Theory[]>` — returns library rows + custom theories merged, in `selectedIds` order.
- `newCustomTheoryId(): string` → `"custom:" + crypto.randomUUID()`.
- `isCustomId(id: string): boolean` → `id.startsWith('custom:')`.
- `verifyCitation(input: { doi?: string; text?: string }): Promise<CitationLookup>` where
  `CitationLookup = { verified: boolean; meta?: { name: string; author: string; year: number | null; doi: string | null; title: string } }`.

- [ ] **Step 1: Add types to `types/database.ts`**

Add after `TheorySuggestion`:
```ts
export interface CustomTheory {
  id: string                 // "custom:<uuid>"
  name: string
  author: string
  year: number | null
  summary: string
  concepts: string[]
  disciplines: string[]
  doi: string | null
  verification: 'doi_verified' | 'unverified'   // stored — never re-derived on render
  added_by_user: true
  source_citation: string    // raw text the student pasted
}
```
Extend the `theories` block inside `ResearchContext`:
```ts
  theories?: {
    selected_ids: string[]
    reading_list_items: ReadingListItem[]
    custom_theories?: CustomTheory[]
    suggestions?: TheorySuggestion[]   // cached so re-entry keeps AI reasons w/o re-calling Claude
  }
```
Extend `socratic_gate_1`:
```ts
  socratic_gate_1?: {
    completed: boolean
    responses: Record<string, string>
    questions?: ClarificationQuestion[]
    context_note?: string              // optional free-text nuance folded into downstream generation
  }
```

- [ ] **Step 2: Create `lib/project-theories.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ResearchContext, Theory, CustomTheory } from '@/types/database'

export function isCustomId(id: string): boolean {
  return id.startsWith('custom:')
}

export function newCustomTheoryId(): string {
  return 'custom:' + crypto.randomUUID()
}

// Map a stored CustomTheory into the shape the rest of the app expects (Theory).
function customToTheory(c: CustomTheory): Theory {
  return {
    id: c.id,
    name: c.name,
    author: c.author,
    year: c.year ?? 0,
    summary: c.summary,
    concepts: c.concepts,
    disciplines: c.disciplines,
    doi: c.doi,
    openalex_id: null,
    created_at: '',
  }
}

/**
 * Resolve a project's selected theory ids into full Theory objects,
 * merging global library rows with per-project custom theories.
 * Order follows selectedIds. Missing ids are dropped.
 */
export async function resolveProjectTheories(
  ctx: ResearchContext,
  selectedIds: string[],
  supabase: SupabaseClient
): Promise<Theory[]> {
  const customById = new Map(
    (ctx.theories?.custom_theories ?? []).map(c => [c.id, customToTheory(c)])
  )
  const globalIds = selectedIds.filter(id => !isCustomId(id))

  let globalById = new Map<string, Theory>()
  if (globalIds.length) {
    const { data } = await supabase.from('theories').select('*').in('id', globalIds)
    globalById = new Map((data as Theory[] ?? []).map(t => [t.id, t]))
  }

  return selectedIds
    .map(id => (isCustomId(id) ? customById.get(id) : globalById.get(id)))
    .filter((t): t is Theory => !!t)
}
```

- [ ] **Step 3: Add `verifyCitation` to `lib/openalex.ts`**

Append (keeps existing `verifyTheory`/`isInReadingList`):
```ts
export interface CitationLookup {
  verified: boolean
  meta?: { name: string; author: string; year: number | null; doi: string | null; title: string }
}

function normalizeDoi(raw: string): string {
  return raw.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '')
}

// Pull first-author surname + year from OpenAlex work JSON
function metaFromWork(w: any): CitationLookup['meta'] {
  const authorObj = w?.authorships?.[0]?.author?.display_name ?? ''
  const surname = authorObj ? authorObj.split(' ').slice(-1)[0] : 'Unknown'
  return {
    name: w?.title ?? w?.display_name ?? 'Untitled work',
    author: surname,
    year: typeof w?.publication_year === 'number' ? w.publication_year : null,
    doi: w?.doi ? normalizeDoi(w.doi) : null,
    title: w?.title ?? w?.display_name ?? '',
  }
}

/**
 * Verify a bring-your-own citation. DOI-first (exact), title-search fallback (best match).
 * Returns verified:false with no meta when nothing is found — caller shows a "?" chip,
 * never presents it as fact.
 */
export async function verifyCitation(input: { doi?: string; text?: string }): Promise<CitationLookup> {
  const doi = input.doi ? normalizeDoi(input.doi) : ''
  try {
    if (doi) {
      const res = await fetch(
        `${OPENALEX_BASE}/works/doi:${encodeURIComponent(doi)}?mailto=${MAILTO}`,
        { next: { revalidate: 86400 } }
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.id) return { verified: true, meta: metaFromWork(data) }
      }
    }
    const text = (input.text ?? '').trim()
    if (text) {
      const res = await fetch(
        `${OPENALEX_BASE}/works?search=${encodeURIComponent(text)}&per-page=1&mailto=${MAILTO}`,
        { next: { revalidate: 86400 } }
      )
      if (res.ok) {
        const data = await res.json()
        const w = data?.results?.[0]
        if (w?.id) return { verified: true, meta: metaFromWork(w) }
      }
    }
  } catch {
    /* fall through to unverified */
  }
  return { verified: false }
}
```
Note: `OPENALEX_BASE` and `MAILTO` consts already exist at the top of the file — reuse them.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (helpers are pure/typed; no call-sites changed yet).

- [ ] **Step 5: Commit**

```bash
git add types/database.ts lib/project-theories.ts lib/openalex.ts
git commit -m "feat(plan): custom-theory types, resolveProjectTheories, verifyCitation"
```

---

## Task 1: Editable steps — unlock gate 1, unlock theories, fix framework ripple

Makes each step revisable. Reuses existing `outdated_blocks` mechanics; adds the missing regenerate-on-outdated path for framework.

**Files:**
- Modify: `app/project/[id]/gate1/page.tsx`
- Modify: `app/project/[id]/gate1/Gate1Form.tsx`
- Modify: `app/project/[id]/gate1/actions.ts`
- Modify: `app/project/[id]/theories/page.tsx`
- Modify: `app/project/[id]/theories/TheoryCards.tsx`
- Modify: `app/project/[id]/theories/actions.ts`
- Modify: `app/project/[id]/framework/page.tsx`

**Interfaces consumed:** `resolveProjectTheories` (Task 0).
**Interfaces produced:** `saveTheorySelection` now also persists `ctx.theories.suggestions`; gate1 `submitGate1` accepts `contextNote` form field and sets `outdated_blocks`.

- [ ] **Step 1: Gate 1 editable re-entry — `gate1/page.tsx`**

Replace the hard read-only branch (currently `if (gate1?.completed) { ...review card... }`) so the review card gains an **"Edit answers"** control that renders `Gate1Form` seeded with saved `responses` + `context_note`. Implementation: pass `initialAnswers` and `initialContextNote` props into `Gate1Form` and drop the early-return lock; when `completed`, show the review card by default with an "Edit answers" link that sets a client flag to reveal the form. Simplest: always render `Gate1Form` with `initialAnswers={responses}` and `initialContextNote={context_note}`; keep the review card as the collapsed default inside the form component. (Keep it minimal — reuse existing review-card styles.)

- [ ] **Step 2: Gate 1 form seeding + context field — `gate1/Gate1Form.tsx`**

- Add props `initialAnswers?: Record<string,string>` and `initialContextNote?: string`; initialize `useState(initialAnswers ?? {})` and a new `contextNote` state from `initialContextNote ?? ''`.
- Below the RadioCard options block, add ONE optional textarea (single-column, 720px, brand tokens):
```tsx
<div style={s.contextBlock}>
  <label htmlFor="ctx-note" style={s.contextLabel}>Add context (optional)</label>
  <p style={s.contextHint}>Anything specific about your case, sample, or constraints? We&apos;ll fold it into what we suggest next.</p>
  <textarea
    id="ctx-note"
    value={contextNote}
    onChange={e => setContextNote(e.target.value)}
    rows={3}
    maxLength={600}
    placeholder="e.g. My sample is SMEs in a post-conflict economy, so generalisable models may not transfer."
    style={s.contextTextarea}
  />
</div>
```
- Include `contextNote` in BOTH submit paths (`goForward` finish + "Keep my current answer") via `formData.append('contextNote', contextNote)`.
- Styles use existing tokens only: `--sheet`, `--stone-soft`, `--radius`, `--pencil`, `--graphite`, `--ink`.

- [ ] **Step 3: Persist context + invalidate downstream — `gate1/actions.ts`**

In `submitGate1`, read `const contextNote = (formData.get('contextNote') as string ?? '').trim()`. Compute whether anything changed vs existing (`existingGate1.responses`, `existingGate1.context_note`). When changed AND downstream exists, add to `outdated_blocks` (mirror theory-swap logic):
```ts
const ctx = project.research_context
const changed =
  JSON.stringify(existingGate1.responses ?? {}) !== JSON.stringify(answers) ||
  (existingGate1.context_note ?? '') !== contextNote
const current: string[] = ctx?.outdated_blocks ?? []
const outdated_blocks = changed && ctx?.theories?.selected_ids?.length
  ? Array.from(new Set([...current, 'theories', 'framework', 'methodology', 'interview_guide']))
  : current
```
Write via `updateResearchContext(projectId, 'socratic_gate_1', { socratic_gate_1: { ...existingGate1, completed: true, responses: answers, context_note: contextNote }, outdated_blocks }, supabase)`.

- [ ] **Step 4: Theories — stop faking suggestions, persist them, unlock — `theories/page.tsx`**

- Replace lines 40-42 logic: instead of fabricating `{ theory_id, why_it_fits:'', fit_score:1 }` from `selected_ids`, use cached `ctx.theories?.suggestions` when present; otherwise call `suggestTheories` and (in the action, Step 6) persist them. Build cards from `suggestions` as today.
- Remove `readOnly={!!ctx.theories?.selected_ids?.length}` → pass `readOnly={false}` (or drop the prop; keep the prop for now but always allow editing).
- Verify custom theories are shown as cards too: after building suggestion cards, append cards for any `ctx.theories.custom_theories` (so revisiting shows the student's own theories with their stored `verification` chip and pre-checked if selected). Map `CustomTheory.verification` → `VerificationStatus` (`doi_verified` → `{kind:'doi_verified',doi}`, else `{kind:'unverified'}`).

- [ ] **Step 5: Framework regenerate-on-outdated + Review-changes banner — `framework/page.tsx`**

- Replace `.from('theories').select('*').in('id', selectedIds)` with `const theories = await resolveProjectTheories(ctx, selectedIds, supabase)` (also fixes custom theories in the framework).
- Change the load guard: currently `if (!edges.length) { regenerate }`. Make it regenerate when stale:
```ts
const isOutdated = (ctx.outdated_blocks ?? []).includes('framework')
let edges = (!isOutdated && ctx.framework?.edges?.length) ? ctx.framework.edges : []
// ...same for narrativeResult / citationStatuses: only reuse saved when !isOutdated
if (!edges.length) { /* existing generate + verify block */ }
```
- Pass an `outdated` boolean into `FrameworkBuilder` so it can render a `[Review changes]` banner ("Your upstream choices changed — this framework was regenerated. Review and save to confirm."). Saving already clears `framework` from `outdated_blocks` (`framework/actions.ts`) — no change needed there.

- [ ] **Step 6: `saveTheorySelection` persists suggestions + tolerates custom ids — `theories/actions.ts`**

- The theory metadata fetch (`.from('theories').select(...).in('id', selectedIds)`) must skip `custom:` ids: filter `const globalIds = selectedIds.filter(id => !id.startsWith('custom:'))` and query those; build `reading_list_items` for global theories, and append entries for selected custom theories from `ctx.theories.custom_theories` (`match_type: 'beyond_list'`, `matched_theory_id: c.id`, `doi: c.doi`).
- Persist `suggestions` if passed (add hidden form field `suggestions` from the page, or re-read from ctx if already cached). Keep existing `outdated_blocks` swap logic intact.

- [ ] **Step 7: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 8: Manual dogfood**

Using the browse/gstack skill against `npm run dev`: complete gate 1 with a context note → revisit gate 1, edit an answer → confirm dashboard shows `⚠ Outdated` on framework → open framework → confirm it regenerated with a Review-changes banner → save → dashboard clears ⚠. Revisit theories → confirm cards are editable (not locked) and AI reasons persist.

- [ ] **Step 9: Commit**

```bash
git add app/project/\[id\]/gate1 app/project/\[id\]/theories app/project/\[id\]/framework
git commit -m "feat(plan): editable gate1 + theories, framework regenerate-on-outdated, gate context field"
```

---

## Task 2: Browse full library

**Files:**
- Modify: `app/project/[id]/theories/page.tsx`
- Modify: `app/project/[id]/theories/TheoryCards.tsx`

**Interfaces consumed:** existing verified-card pipeline.

- [ ] **Step 1: Pass the full library — `theories/page.tsx`**

`allTheories` is already fetched. Build a second card array `libraryCards` for ALL theories (verify in parallel like suggestions; reuse `verifyTheory` + `isInReadingList`). Pass both `cards={sortedCards}` (suggested) and `libraryCards` into `TheoryCards`. To avoid double OpenAlex work, verify the union once and index by id.

- [ ] **Step 2: Browse toggle UI — `TheoryCards.tsx`**

Add a view toggle above the grid: **"Suggested for you"** (default) / **"Browse full library"**. Store `view` in `useState`. Render `cards` or `libraryCards` accordingly; selection `Set` is shared across both views so a theory picked in one is checked in the other. Keep `MIN/MAX_SELECT`, chips, single-column 720px. Toggle styled with existing tokens (mirror the framework layout-switcher button pattern: `--ink-blue` active).

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 4: Manual dogfood**

Toggle to full library → pick a non-suggested theory → toggle back → confirm it's still selected → build framework includes it.

- [ ] **Step 5: Commit**

```bash
git add app/project/\[id\]/theories
git commit -m "feat(plan): browse full theory library view"
```

---

## Task 3: Bring-your-own verified theory

**Files:**
- Modify: `app/project/[id]/theories/TheoryCards.tsx`
- Modify: `app/project/[id]/theories/actions.ts`
- Modify (resolver swap): `app/project/[id]/methodology/page.tsx`, `app/project/[id]/interview-guide/page.tsx`, `app/project/[id]/export/page.tsx`, `app/project/[id]/page.tsx`, `app/project/[id]/analysis/actions.ts`
  (framework already swapped in Task 1 Step 5.)

**Interfaces consumed:** `verifyCitation`, `resolveProjectTheories`, `newCustomTheoryId`, `CustomTheory` (Task 0).

- [ ] **Step 1: `addCustomTheory` server action — `theories/actions.ts`**

```ts
export async function addCustomTheory(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const doi  = (formData.get('doi') as string ?? '').trim()
  const text = (formData.get('citation') as string ?? '').trim()
  const name = (formData.get('name') as string ?? '').trim()

  const { data: project } = await supabase
    .from('projects').select('research_context')
    .eq('id', projectId).eq('user_id', user.id).single()
  if (!project) redirect('/onboarding')

  const lookup = await verifyCitation({ doi, text })
  const m = lookup.meta
  const custom: CustomTheory = {
    id: newCustomTheoryId(),
    name: m?.name || name || text || 'Untitled theory',
    author: m?.author || 'Unknown',
    year: m?.year ?? null,
    summary: '',
    concepts: [],
    disciplines: [],
    doi: m?.doi ?? (doi || null),
    verification: lookup.verified ? 'doi_verified' : 'unverified',
    added_by_user: true,
    source_citation: text || doi || name,
  }

  const ctx = project.research_context
  const existing: CustomTheory[] = ctx?.theories?.custom_theories ?? []
  await updateResearchContext(projectId, 'theories', {
    theories: {
      ...(ctx?.theories ?? { selected_ids: [], reading_list_items: [] }),
      custom_theories: [...existing, custom],
    },
  }, supabase)

  redirect(`/project/${projectId}/theories`)
}
```
(`verification` uses `'doi_verified'` for any OpenAlex match — the union `'doi_verified' | 'unverified'` matches the stored CustomTheory type. Do NOT use `classic_verified` for BYO.)

- [ ] **Step 2: Add-your-own form — `TheoryCards.tsx`**

Add a collapsible "Add your own theory" panel below the grid (single-column). Fields: DOI (optional), citation text (optional), display name (optional). Submit posts to `addCustomTheory`. After add, the theory re-renders as a card via server round-trip with:
- verified → `✓` green `StatusChip` (`doi_verified`), selectable.
- unverified → `?` gray `StatusChip`, **shown** with label "Unverified — verify manually", still selectable but never worded as fact.
Reuse `StatusChip`. Copy tone: co-constructive, calm.

- [ ] **Step 3: Swap the 5 remaining resolver sites**

In each of `methodology/page.tsx`, `interview-guide/page.tsx`, `export/page.tsx`, `page.tsx` (dashboard data loader), `analysis/actions.ts`: replace `supabase.from('theories').select(...).in('id', ctx.theories!.selected_ids)` with `await resolveProjectTheories(ctx, ctx.theories!.selected_ids, supabase)`. Confirm each downstream consumer (methodology prompt, interview-guide prompt, export view, dashboard `theoryMap`) receives the merged `Theory[]` — custom theories become first-class in generation and display.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 5: Manual dogfood**

Add a real DOI (e.g. `10.2307/2095101`) → `✓` chip, selectable → add a nonsense citation → `?` chip, shown not hidden → select 1 library + 1 custom verified → build framework → confirm custom theory appears by name in the diagram + narrative → check methodology/interview-guide/export all include it → confirm suggestions grid never shows custom theories (AI pool clean).

- [ ] **Step 6: Commit**

```bash
git add app/project/\[id\]
git commit -m "feat(plan): bring-your-own verified theory, resolver across all downstream sites"
```

---

## Task 4: Fold gate context note into generation

(Gate UI field + persistence shipped in Task 1. This wires it into the LLM prompt.)

**Files:**
- Modify: `lib/prompts/theories.ts`

- [ ] **Step 1: Append context note to the suggest prompt — `lib/prompts/theories.ts`**

In `suggestTheories`, after the existing gate1 responses line, add:
```ts
${gate1?.context_note ? `Student's added context (fold this nuance into your reasoning, weight it): ${gate1.context_note}` : ''}
```
No schema/output change; `why_it_fits` reasoning now reflects the nuance. (Optional, note only: the same note can later be threaded into `lib/prompts/framework.ts` narrative — out of scope unless requested.)

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 3: Manual dogfood**

Set a distinctive context note (e.g. "post-conflict SME sample") → clear cached suggestions (re-run suggest) → confirm at least one `why_it_fits` references the nuance.

- [ ] **Step 4: Commit**

```bash
git add lib/prompts/theories.ts
git commit -m "feat(plan): fold Socratic gate context note into theory suggestions"
```

---

## Self-Review (run before execution)

1. **Spec coverage:** (1) editable steps → Task 1; (2) browse library → Task 2; (3) BYO verified + data model → Task 0+3; (4) gate context field → Task 1 (UI/persist) + Task 4 (generation). ✓
2. **Data-model decision:** custom theories in `research_context.theories.custom_theories`, resolver merges at all 6 sites, AI pool untouched, no migration. ✓
3. **User's two adds:** merge into generation (resolver → framework + methodology prompts) ✓; store verification in JSON (`CustomTheory.verification`) ✓.
4. **Type consistency:** `resolveProjectTheories`, `verifyCitation`, `CitationLookup`, `CustomTheory`, `newCustomTheoryId` used consistently across tasks. ✓
5. **Constraints:** no new colors, 720px, `?` shown-not-hidden, structured single-select + one optional field, no migration. ✓

## HARD-STOP
No DB migration required (Option A). Do NOT deploy to production. Stop after Task 4 verification and report for review.
