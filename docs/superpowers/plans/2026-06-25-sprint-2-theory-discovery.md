# Sprint 2 — Theory Discovery Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given a completed `research_context` (brief + gate1 answers), Claude suggests the top 5 matching theories from the closed library, each with a "why it fits" reason; student selects 2–4; selection is saved to `research_context` with OpenAlex-verified citation status.

**Architecture:** A new `/project/[id]/theories` route reads the full theories table from Supabase and passes it to Claude (so Claude can only pick from real library entries — never invents citations). Claude returns theory IDs + reasoning. The server runs OpenAlex verification per theory before rendering the page. Theory selection is saved via a server action. Reading-list matching is done server-side by fuzzy-comparing the stored raw reading list against theory author names.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Claude API (`generateJSON`), OpenAlex REST API (free, no auth, `mailto` polite pool), inline CSS.

## Global Constraints

- Theory library is **closed** — Claude receives the full list of real theory IDs/names and may only return IDs from that list. Never surface a theory not in `public.theories`.
- OpenAlex API base: `https://api.openalex.org` — always append `&mailto=bermet.ak@gmail.com` for polite pool. No API key needed.
- Pre-DOI classics (year < 1995 or no DOI in library) → `classic_verified` status, not `unverified`. See `StatusChip` VerificationStatus type.
- `StatusChip` component already exists at `components/ui/StatusChip.tsx` — never duplicate it.
- All research_context writes go through `updateResearchContext()` from `lib/research-context.ts`.
- Single column, max-width 720px. Theory cards in a responsive 2-col grid (≥600px) / 1-col (mobile). Selected card: `--ink-blue` border + ✓ icon top-right corner.
- Buttons: 10px radius, Schibsted Grotesk 600, no uppercase. Primary: `--ink-blue` bg. Disabled: `--paper-deep` bg, `--pencil` text.
- Error copy: guidance tone — e.g. "Pick at least 2 to see how they relate" not "Selection required".
- No new npm packages needed for this sprint.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `types/database.ts` | **Modify** | Add `reading_list_raw` to `BriefExtraction`; add `TheorySuggestion` type |
| `app/project/[id]/brief/actions.ts` | **Modify** | Store `reading_list_raw` in `research_context.brief` |
| `lib/openalex.ts` | **Create** | `verifyTheory(theory: Theory)` → `VerificationStatus` |
| `lib/prompts/theories.ts` | **Create** | `suggestTheories(ctx, allTheories)` → `TheorySuggestion[]` |
| `app/project/[id]/theories/page.tsx` | **Create** | Server component: fetch theories, run suggestions + verification, render |
| `app/project/[id]/theories/TheoryCards.tsx` | **Create** | Client component: card grid, selection state, "Build my framework" CTA |
| `app/project/[id]/theories/actions.ts` | **Create** | `saveTheorySelection(formData)` → saves to `research_context.theories` |
| `app/project/[id]/page.tsx` | **Modify** | Route to `/theories` if gate1 done but no theories selected yet |

---

## Task 1 — Store reading_list_raw + add TheorySuggestion type

**Files:**
- Modify: `types/database.ts`
- Modify: `app/project/[id]/brief/actions.ts`

**Interfaces:**
- Produces:
  - `BriefExtraction.reading_list_raw?: string` — raw pasted text stored alongside brief
  - `TheorySuggestion` type — shape Claude returns per theory

- [ ] **Step 1: Add `reading_list_raw` to `BriefExtraction` in types/database.ts**

In `types/database.ts`, change `BriefExtraction` to:

```typescript
export interface BriefExtraction {
  topic: string
  research_question: string
  research_type: ResearchType
  constraints: string[]
  degree_level: string
  discipline: string
  reading_list_raw?: string  // raw pasted text from Screen 1 — used for theory matching
}
```

- [ ] **Step 2: Add `TheorySuggestion` type to types/database.ts**

Append after `BriefExtraction`:

```typescript
export interface TheorySuggestion {
  theory_id: string
  why_it_fits: string   // 1-2 sentence plain-language explanation
  fit_score: number     // 1-5, used to sort cards (highest first)
}
```

- [ ] **Step 3: Store reading_list_raw in submitBrief server action**

In `app/project/[id]/brief/actions.ts`, the `extractBrief()` call already receives `readingList`. After getting `briefExtraction` back from Claude, add the raw text to it before saving:

Find this section in the file:
```typescript
  // 1. Extract structured brief via Claude
  const briefExtraction = await extractBrief(
    topic, degreeLevel, discipline,
    readingList ?? undefined,
    fileText
  )
```

Add one line immediately after:
```typescript
  // Preserve raw reading list for theory-matching in Sprint 2
  if (readingList) briefExtraction.reading_list_raw = readingList
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/typescript/lib/tsc.js --noEmit 2>&1
```

Expected: no output (no errors).

- [ ] **Step 5: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add types/database.ts "app/project/[id]/brief/actions.ts"
git commit -m "feat: store reading_list_raw in research_context.brief, add TheorySuggestion type"
```

---

## Task 2 — OpenAlex verification helper

**Files:**
- Create: `lib/openalex.ts`

**Interfaces:**
- Consumes: `Theory` type from `types/database.ts`, `VerificationStatus` from `components/ui/StatusChip.tsx`
- Produces: `verifyTheory(theory: Theory): Promise<VerificationStatus>`

- [ ] **Step 1: Create lib/openalex.ts**

```typescript
// lib/openalex.ts
import type { Theory } from '@/types/database'
import type { VerificationStatus } from '@/components/ui/StatusChip'

const OPENALEX_BASE = 'https://api.openalex.org'
const MAILTO = 'bermet.ak@gmail.com'

/**
 * Verifies a theory citation via OpenAlex.
 * - If the theory has a DOI in our library → verify via DOI lookup
 * - If the theory predates the DOI system (year < 1995 or no DOI) → classic_verified
 * - If DOI lookup fails → unverified
 *
 * Always appends mailto for OpenAlex polite pool (higher rate limits).
 */
export async function verifyTheory(theory: Theory): Promise<VerificationStatus> {
  // Pre-DOI classics — verified by inclusion in our curated library
  if (!theory.doi || (theory.year !== null && theory.year < 1995)) {
    return { kind: 'classic_verified', source: `${theory.author}, ${theory.year} — confirmed via curated library` }
  }

  try {
    const url = `${OPENALEX_BASE}/works/doi:${encodeURIComponent(theory.doi)}?mailto=${MAILTO}`
    const res = await fetch(url, { next: { revalidate: 86400 } }) // cache 24h

    if (!res.ok) return { kind: 'unverified' }

    const data = await res.json()
    if (data?.doi) {
      return { kind: 'doi_verified', doi: data.doi }
    }
    return { kind: 'unverified' }
  } catch {
    return { kind: 'unverified' }
  }
}

/**
 * Checks whether a theory appears in the student's raw reading list.
 * Simple heuristic: does the text contain the author's surname?
 * Returns true if a match is found.
 */
export function isInReadingList(theory: Theory, readingListRaw: string): boolean {
  if (!readingListRaw) return false
  const haystack = readingListRaw.toLowerCase()
  // Match on last name of first listed author (e.g. "Bandura" from "Bandura")
  const surname = theory.author.split(/[,&]/)[0].trim().toLowerCase()
  return haystack.includes(surname)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/typescript/lib/tsc.js --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Manual smoke test (optional but recommended)**

Create a temporary test script to confirm the OpenAlex API is reachable:

```bash
node -e "
fetch('https://api.openalex.org/works/doi:10.2307/249008?mailto=bermet.ak@gmail.com')
  .then(r => r.json())
  .then(d => console.log('DOI check:', d.doi, d.title))
  .catch(e => console.error(e))
"
```

Expected output: something like `DOI check: https://doi.org/10.2307/249008 Perceived Usefulness...`

- [ ] **Step 4: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add lib/openalex.ts
git commit -m "feat: OpenAlex citation verification helper"
```

---

## Task 3 — Claude theory suggestion prompt

**Files:**
- Create: `lib/prompts/theories.ts`

**Interfaces:**
- Consumes: `ResearchContext` from `types/database.ts`, `Theory` from `types/database.ts`, `TheorySuggestion` from `types/database.ts`
- Produces: `suggestTheories(ctx: ResearchContext, allTheories: Theory[]): Promise<TheorySuggestion[]>`

- [ ] **Step 1: Create lib/prompts/theories.ts**

```typescript
// lib/prompts/theories.ts
import { generateJSON } from '@/lib/claude'
import type { ResearchContext, Theory, TheorySuggestion } from '@/types/database'

const SYSTEM = `You are a research methodology assistant helping Masters and PhD students build their theoretical framework.
Given a student's research brief and a list of available theories, suggest the 5 most relevant theories.
You MUST only suggest theories from the provided list — never invent a theory, author, or citation.
For each suggestion, explain in plain language why it fits this specific research question.
Respond with a single valid JSON array — no markdown, no explanation, just the JSON.`

export async function suggestTheories(
  ctx: ResearchContext,
  allTheories: Theory[]
): Promise<TheorySuggestion[]> {
  const brief = ctx.brief!
  const gate1 = ctx.socratic_gate_1

  // Build a compact library listing so Claude knows exactly what's available
  const libraryListing = allTheories.map(t =>
    `ID: ${t.id} | Name: ${t.name} | Author: ${t.author} (${t.year ?? 'n/d'}) | Disciplines: ${t.disciplines.join(', ')} | Concepts: ${t.concepts.slice(0, 4).join(', ')}`
  ).join('\n')

  const userPrompt = `Student's research context:
Topic: ${brief.topic}
Research question: ${brief.research_question}
Research type: ${brief.research_type}
Discipline: ${brief.discipline}
Degree level: ${brief.degree_level}
${brief.constraints?.length ? `Constraints: ${brief.constraints.join('; ')}` : ''}
${gate1?.responses ? `Clarification answers: ${JSON.stringify(gate1.responses)}` : ''}

Available theory library (you MUST only suggest IDs from this list):
${libraryListing}

Return a JSON array of exactly 5 objects, sorted by fit (best fit first):
[
  {
    "theory_id": "<exact UUID from the library above>",
    "why_it_fits": "<1-2 sentences explaining why this theory fits THIS specific research question — be concrete, not generic>",
    "fit_score": <integer 1-5, where 5 = strongest fit>
  }
]

Rules:
- theory_id must be an exact ID from the library list above — never invent one
- why_it_fits must reference the student's actual topic, not generic praise
- Vary disciplines if possible — don't suggest 5 theories from the same field
- fit_score 5 = theory is central to this type of research; 1 = tangentially relevant`

  const suggestions = await generateJSON<TheorySuggestion[]>(SYSTEM, userPrompt, 1024)

  // Safety filter: remove any suggestion whose ID isn't in our library
  const validIds = new Set(allTheories.map(t => t.id))
  return suggestions.filter(s => validIds.has(s.theory_id))
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/typescript/lib/tsc.js --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add lib/prompts/theories.ts
git commit -m "feat: Claude theory suggestion prompt with closed-library safety filter"
```

---

## Task 4 — TheoryCards client component

**Files:**
- Create: `app/project/[id]/theories/TheoryCards.tsx`

**Interfaces:**
- Consumes:
  - `TheoryCardData` (defined in this task)
  - `saveTheorySelection` server action from `./actions` (stub until Task 5)
- Produces: `<TheoryCards projectId cards readingListRaw />` — full Screen 3a UI

The component receives pre-verified data from the server — it does not call OpenAlex directly.

- [ ] **Step 1: Create app/project/[id]/theories/TheoryCards.tsx**

```tsx
'use client'

import { useState } from 'react'
import StatusChip, { type VerificationStatus } from '@/components/ui/StatusChip'
import { saveTheorySelection } from './actions'

export interface TheoryCardData {
  id: string
  name: string
  author: string
  year: number | null
  summary: string
  concepts: string[]
  why_it_fits: string
  verification: VerificationStatus
  in_reading_list: boolean
}

interface Props {
  projectId: string
  cards: TheoryCardData[]
  readingListRaw?: string
}

const MIN_SELECT = 2
const MAX_SELECT = 4

export default function TheoryCards({ projectId, cards }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SELECT) {
        next.add(id)
      }
      return next
    })
  }

  const count = selected.size
  const canSubmit = count >= MIN_SELECT && count <= MAX_SELECT

  let helperText = ''
  if (count === 0) helperText = 'Pick 2–4 theories to see how they relate.'
  else if (count === 1) helperText = 'Pick at least one more to see how they relate.'
  else if (count === MAX_SELECT) helperText = "4 is plenty to start — try narrowing it down if needed."

  async function handleBuild() {
    if (!canSubmit) return
    setSubmitting(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('selectedIds', JSON.stringify(Array.from(selected)))
    await saveTheorySelection(formData)
  }

  return (
    <div style={s.wrapper}>
      {/* Intro banner */}
      <div style={s.banner}>
        <p style={s.bannerText}>
          Based on your question, these theories tend to fit well.
          Pick 2–4 to build on.
        </p>
      </div>

      {/* Card grid */}
      <div style={s.grid}>
        {cards.map(card => {
          const isSelected = selected.has(card.id)
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggle(card.id)}
              aria-pressed={isSelected}
              style={{
                ...s.card,
                borderColor: isSelected ? 'var(--ink-blue)' : 'var(--stone-soft)',
              }}
            >
              {/* Selection checkmark */}
              {isSelected && (
                <span style={s.checkmark}>✓</span>
              )}

              {/* Header */}
              <div style={s.cardHeader}>
                <p style={s.theoryName}>{card.name}</p>
                <p style={s.theoryMeta}>{card.author}{card.year ? `, ${card.year}` : ''}</p>
              </div>

              {/* Why it fits */}
              <p style={s.whyItFits}>{card.why_it_fits}</p>

              {/* Concept tags */}
              <div style={s.tags}>
                {card.concepts.slice(0, 4).map(c => (
                  <span key={c} style={s.tag}>{c}</span>
                ))}
              </div>

              {/* Chips row */}
              <div style={s.chips}>
                <StatusChip status={card.verification} />
                {card.in_reading_list && (
                  <span style={s.readingListChip}>+ In your reading list</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Helper text + CTA */}
      <div style={s.footer}>
        {helperText && <p style={s.helperText}>{helperText}</p>}
        <button
          type="button"
          onClick={handleBuild}
          disabled={!canSubmit || submitting}
          style={{
            ...s.buildBtn,
            ...(!canSubmit || submitting ? s.buildBtnDisabled : {}),
          }}
        >
          {submitting ? 'Saving...' : 'Build my framework →'}
        </button>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrapper:  { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  banner:   { padding: '1rem 1.25rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  bannerText: { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.6 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1.25rem',
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.1s',
  },
  checkmark: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--ink-blue)',
    color: 'var(--sheet)',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  cardHeader: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
  theoryName: { fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)', lineHeight: 1.3 },
  theoryMeta: { fontSize: '0.8125rem', color: 'var(--pencil)' },
  whyItFits: {
    fontFamily: 'Source Serif 4, Georgia, serif',
    fontSize: '0.875rem',
    fontStyle: 'italic',
    color: 'var(--graphite)',
    lineHeight: 1.6,
  },
  tags: { display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem' },
  tag:  { padding: '2px 8px', background: 'var(--paper-deep)', color: 'var(--graphite)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' },
  chips: { display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem', marginTop: 'auto' },
  readingListChip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px',
    background: 'var(--sky)', color: 'var(--ink-blue)',
    borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 500,
  },
  footer:         { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' },
  helperText:     { fontSize: '0.875rem', color: 'var(--pencil)', alignSelf: 'flex-start' },
  buildBtn:       { padding: '0.75rem 1.5rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  buildBtnDisabled: { background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
}
```

- [ ] **Step 2: Create stub actions.ts so TypeScript resolves the import**

```typescript
// app/project/[id]/theories/actions.ts
'use server'
export async function saveTheorySelection(_formData: FormData): Promise<void> {
  throw new Error('Not implemented — Task 5')
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/typescript/lib/tsc.js --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add "app/project/[id]/theories/"
git commit -m "feat: TheoryCards client component (Screen 3a UI)"
```

---

## Task 5 — Theories page + server action + routing

**Files:**
- Create: `app/project/[id]/theories/page.tsx`
- Modify: `app/project/[id]/theories/actions.ts` (replace stub)
- Modify: `app/project/[id]/page.tsx`

**Interfaces:**
- Consumes: `suggestTheories()`, `verifyTheory()`, `isInReadingList()`, `updateResearchContext()`, `TheoryCards`, `TheoryCardData`
- Produces:
  - `saveTheorySelection(formData)` — saves `selected_ids` + `reading_list_items` to `research_context.theories`
  - `/project/[id]/theories` route renders theory cards
  - `/project/[id]` redirects to `/theories` when gate1 done but no theories selected

- [ ] **Step 1: Replace stub with real saveTheorySelection in actions.ts**

```typescript
// app/project/[id]/theories/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import type { ReadingListItem } from '@/types/database'

export async function saveTheorySelection(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId   = formData.get('projectId') as string
  const selectedIds = JSON.parse(formData.get('selectedIds') as string) as string[]

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const readingListRaw: string = project.research_context?.brief?.reading_list_raw ?? ''

  // Fetch selected theories to build reading_list_items
  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year, doi')
    .in('id', selectedIds)

  const readingListItems: ReadingListItem[] = (theories ?? []).map(t => ({
    raw_ref: `${t.author} (${t.year ?? 'n/d'}) — ${t.name}`,
    matched_theory_id: t.id,
    match_type: readingListRaw && t.author &&
      readingListRaw.toLowerCase().includes(t.author.split(/[,&]/)[0].trim().toLowerCase())
      ? 'in_list'
      : 'beyond_list',
    doi: t.doi ?? null,
  }))

  await updateResearchContext(
    projectId,
    'theories',
    {
      theories: {
        selected_ids: selectedIds,
        reading_list_items: readingListItems,
      },
    },
    supabase
  )

  // Sprint 3: redirect to framework builder
  // For now redirect to project dashboard
  redirect(`/project/${projectId}`)
}
```

- [ ] **Step 2: Create app/project/[id]/theories/page.tsx**

```tsx
// app/project/[id]/theories/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { suggestTheories } from '@/lib/prompts/theories'
import { verifyTheory, isInReadingList } from '@/lib/openalex'
import TheoryCards, { type TheoryCardData } from './TheoryCards'
import type { Project, Theory } from '@/types/database'

export const metadata = { title: 'Choose your theories — Methea' }

export default async function TheoriesPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const p = project as Project
  const ctx = p.research_context

  if (!ctx?.socratic_gate_1?.completed) redirect(`/project/${params.id}/gate1`)
  if (ctx?.theories?.selected_ids?.length) redirect(`/project/${params.id}`)

  // Fetch all theories from the closed library
  const { data: allTheories } = await supabase
    .from('theories')
    .select('*')
    .order('name')

  if (!allTheories || allTheories.length === 0) {
    redirect(`/project/${params.id}`)
  }

  // Ask Claude to suggest top 5
  const suggestions = await suggestTheories(ctx, allTheories as Theory[])

  // Map suggestions → full theory data + OpenAlex verification
  const theoriesById = new Map((allTheories as Theory[]).map(t => [t.id, t]))
  const readingListRaw = ctx.brief?.reading_list_raw ?? ''

  const cards: TheoryCardData[] = await Promise.all(
    suggestions.map(async (s) => {
      const theory = theoriesById.get(s.theory_id)!
      const verification = await verifyTheory(theory)
      return {
        id: theory.id,
        name: theory.name,
        author: theory.author,
        year: theory.year,
        summary: theory.summary,
        concepts: theory.concepts,
        why_it_fits: s.why_it_fits,
        verification,
        in_reading_list: isInReadingList(theory, readingListRaw),
      }
    })
  )

  // Sort by fit_score descending
  const scored = suggestions.map((s, i) => ({ i, score: s.fit_score }))
  scored.sort((a, b) => b.score - a.score)
  const sortedCards = scored.map(({ i }) => cards[i])

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <span style={styles.wordmark}>Methea</span>
        <TheoryCards
          projectId={params.id}
          cards={sortedCards}
          readingListRaw={readingListRaw}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', padding: '3rem 1rem' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  wordmark:  { fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--ink)' },
}
```

- [ ] **Step 3: Update project dashboard routing in app/project/[id]/page.tsx**

Find the routing block that currently reads:

```typescript
  // Route to active step
  if (!p.research_context?.brief) {
    redirect(`/project/${params.id}/brief`)
  }
  if (!p.research_context?.socratic_gate_1?.completed) {
    redirect(`/project/${params.id}/gate1`)
  }
```

Replace with:

```typescript
  // Route to active step
  if (!p.research_context?.brief) {
    redirect(`/project/${params.id}/brief`)
  }
  if (!p.research_context?.socratic_gate_1?.completed) {
    redirect(`/project/${params.id}/gate1`)
  }
  if (!p.research_context?.theories?.selected_ids?.length) {
    redirect(`/project/${params.id}/theories`)
  }
```

- [ ] **Step 4: Full build check**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/next/dist/bin/next build 2>&1 | tail -20
```

Expected: clean build. Route `/project/[id]/theories` appears in route list.

- [ ] **Step 5: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add "app/project/[id]/theories/" "app/project/[id]/page.tsx"
git commit -m "feat: theories page, saveTheorySelection action, routing to /theories"
```

---

## Task 6 — End-to-end verification

**No new files — verification only.**

- [ ] **Step 1: Start dev server**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/next/dist/bin/next dev
```

- [ ] **Step 2: Test full flow with existing project**

Visit `http://localhost:3000`. Sign in. The existing "VV" project (which already has gate1 completed) should now redirect to `/theories` instead of the dashboard.

On the theories page:
- Should see 5 theory cards in a responsive grid
- Each card has: theory name, author/year, italic "why it fits" sentence, concept tags, StatusChip
- Cards that appear in the reading list (if one was pasted) show the sky "+ In your reading list" chip
- "Build my framework →" button should be disabled initially
- Clicking 2 cards → button activates. Clicking a 5th → nothing happens (max 4).
- Click **Build my framework →** → redirects to project dashboard

- [ ] **Step 3: Verify in Supabase**

Table Editor → projects:
- `research_context.theories.selected_ids` contains 2-4 UUIDs
- `research_context.theories.reading_list_items` has entries with `match_type` values
- `context_version` is `4`
- `research_context_versions` has a new row with `changed_block: "theories"`

- [ ] **Step 4: Test with a second project (different discipline)**

Create a new project from onboarding. Use:
- Topic: "How do NHS nurses describe burnout during post-pandemic wards?"
- Degree: PhD, Discipline: Health Sciences
- Complete gate1

Confirm that the theory cards suggested are substantively different from the Business & Management project — Claude should be suggesting different theories (e.g. Maslach's burnout model, Karasek job-demand-control model would be ideal, but they aren't in our 8-seed library, so it should at least prioritize Social Cognitive Theory and Structuration Theory over Resource-Based View).

- [ ] **Step 5: Verify OpenAlex verification chips**

Theories with a DOI in the library (TAM — doi `10.2307/249008`, RBV, etc.) should show green "✓ Verified · DOI found" chip.
Theories without a DOI or pre-1995 (Structuration Theory, Sensemaking, Grounded Theory) should show green "✓ Verified · Classic text" chip.

- [ ] **Step 6: Final commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add -A
git commit -m "sprint 2 complete: theory discovery, OpenAlex verification, theory selection"
```

---

## Sprint 2 Definition of Done (from roadmap)

- [ ] Given a `research_context`, Claude suggests 3–5 theories from the library with plain-language reasoning
- [ ] OpenAlex verification returns DOI status for known theories within ~2s
- [ ] Theories with no DOI (pre-1995 classics) show "Verified · Classic text" not "Unverified"
- [ ] Student can select 2–4 theories; "Build my framework" is disabled outside that range
- [ ] Selection is saved to `research_context.theories.selected_ids`
- [ ] Claude never suggests a theory not in the library (safety filter in `suggestTheories`)
- [ ] Revisiting `/theories` after selection redirects to dashboard (no re-generation)

---

*Sprint 2 plan — June 2026 · methea-app*
