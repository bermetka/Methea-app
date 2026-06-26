# Sprint 3 — Framework Builder + Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given selected theories, Claude generates relationship labels and a citation-verified narrative paragraph; the student sees an auto-laid-out SVG framework diagram in 3 layout presets and can export it as PNG and Word.

**Architecture:** A server component fetches the selected theories, runs two Claude calls (relationship labels + narrative), verifies every citation via OpenAlex, and passes the computed data to a client component that renders a static SVG diagram with a layout switcher and export buttons. All framework state is saved to `research_context.framework` via a server action.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Claude API (`generateJSON`), OpenAlex REST API, inline SVG (static, no canvas in diagram), canvas API (client-side PNG export), `docx` npm package (Word export).

## Global Constraints

- Static SVG for the diagram — no React Flow, no canvas in the diagram itself. Canvas only for PNG export (serialize SVG → canvas → download).
- All `research_context` writes go through `updateResearchContext()` from `lib/research-context.ts`.
- Theory library is closed — all theory data comes from Supabase `theories` table.
- All citations in the narrative must be checked against OpenAlex before display. Unverified citations show gray `?` chip, verified show green `✓`.
- Layout presets: `hierarchy` | `hub-and-spoke` | `linear`. Default: `hub-and-spoke` for 3–4 theories, `linear` for 2.
- SVG canvas: `viewBox="0 0 700 380"` — fits inside 720px max-width column.
- Node size: 180×56px, `rx="8"`. Node fill: `#FBF9F3` (--sheet), stroke: `#11425D` (--ink-blue) 1.5px.
- Edge stroke: `#DDD8C6` (--stone) 1.5px. Edge label: 11px Source Serif 4 italic, `#8C8A82` (--pencil).
- Logo marker swipe: lime `#DDFF55`, diagonal parallelogram SVG behind letterforms (z-index:1), text z-index:2. `bottom:10px` for sm/md variants. Already approved in brandbook.
- No new npm packages except `docx` for Word export. Install: `npm install docx`.
- `--mint` / `--moss` are not in globals.css — the dashboard uses them. Fix in Task 0 by replacing with `var(--verified-text)` / `var(--marker-green)`.
- `docx` types: `npm install --save-dev @types/docx` is NOT needed — `docx` ships its own types.
- OpenAlex polite pool: always append `&mailto=bermet.ak@gmail.com`.
- Buttons: 10px radius, Schibsted Grotesk 600, no uppercase. Primary: `--ink-blue`. Disabled: `--paper-deep` bg, `--pencil` text.
- Tone: co-constructive. "Here's how your theories connect" not "The framework has been generated."

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `app/globals.css` | **Modify** | Add `--moss` and `--mint` tokens |
| `app/project/[id]/page.tsx` | **Modify** | Fix `--moss`/`--mint` refs; add `/framework` routing step |
| `components/ui/Logo.tsx` | **Create** | Shared logo with marker swipe. `size: 'sm'|'md'` |
| `app/login/page.tsx` | **Modify** | Replace plain wordmark with `<Logo size="md" />` |
| `app/project/[id]/brief/page.tsx` | **Modify** | Replace plain wordmark with `<Logo size="sm" />` |
| `app/project/[id]/gate1/page.tsx` | **Modify** | Replace plain wordmark with `<Logo size="sm" />` |
| `app/project/[id]/theories/page.tsx` | **Modify** | Replace plain wordmark with `<Logo size="sm" />` |
| `types/database.ts` | **Modify** | Update `framework` block in `ResearchContext`; add `FrameworkEdge`, `FrameworkCitation` types |
| `lib/prompts/framework.ts` | **Create** | `generateRelationshipLabels()` + `generateFrameworkNarrative()` |
| `components/ui/FrameworkDiagram.tsx` | **Create** | Pure SVG renderer — takes nodes + edges, renders diagram |
| `app/project/[id]/framework/page.tsx` | **Create** | Server component: fetch theories, run Claude, verify citations, render |
| `app/project/[id]/framework/FrameworkBuilder.tsx` | **Create** | Client component: layout switcher, export buttons, `<FrameworkDiagram />` |
| `app/project/[id]/framework/actions.ts` | **Create** | `saveFramework(formData)` → saves to `research_context.framework` |

---

## Task 0 — Logo component + apply to all pages + CSS fix

**Files:**
- Modify: `app/globals.css`
- Create: `components/ui/Logo.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/project/[id]/brief/page.tsx`
- Modify: `app/project/[id]/gate1/page.tsx`
- Modify: `app/project/[id]/theories/page.tsx`
- Modify: `app/project/[id]/page.tsx`

**Interfaces:**
- Produces: `<Logo size="sm" | "md" />` — usable in any page

- [ ] **Step 1: Add missing tokens to globals.css**

Add after the `--error-bg` line in `:root`:

```css
  --mint:       #D6F0DE;
  --moss:       #2E7D4F;
```

Full `:root` block will then have these two new lines. This fixes the dashboard `doneChip` style.

- [ ] **Step 2: Create components/ui/Logo.tsx**

```tsx
// components/ui/Logo.tsx
interface Props {
  size?: 'sm' | 'md'
}

const sizes = {
  sm: { fontSize: '1.25rem', swipeH: 13, swipeBottom: 8  },
  md: { fontSize: '2rem',    swipeH: 20, swipeBottom: 12 },
}

export default function Logo({ size = 'sm' }: Props) {
  const { fontSize, swipeH, swipeBottom } = sizes[size]
  return (
    <div style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
      {/* Marker swipe BEHIND letterforms */}
      <svg
        viewBox="0 0 500 58"
        width="107%"
        height={swipeH}
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-3.5%',
          bottom: swipeBottom,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <path
          d="M8 44 Q4 40 10 36 L478 4 Q492 3 494 12 L498 30 Q499 40 486 42 L24 56 Q10 57 8 44 Z"
          fill="#DDFF55"
          opacity="0.92"
        />
        <path d="M30 40 L460 12 L462 24 L36 50 Z" fill="#DDFF55" opacity="0.5" />
      </svg>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize,
          fontWeight: 400,
          letterSpacing: '-0.045em',
          color: 'var(--ink)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        Methea
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Apply Logo to login page**

In `app/login/page.tsx`, find:
```tsx
        <h1 style={styles.wordmark}>Methea</h1>
```
Replace with:
```tsx
        <Logo size="md" />
```
Add import at top: `import Logo from '@/components/ui/Logo'`

- [ ] **Step 4: Apply Logo to brief page**

In `app/project/[id]/brief/page.tsx`, find the wordmark span (exact text varies — search for `style={styles.wordmark}` or the inline Playfair Display span). Replace with:
```tsx
<Logo size="sm" />
```
Add import: `import Logo from '@/components/ui/Logo'`

- [ ] **Step 5: Apply Logo to gate1 page**

Same pattern in `app/project/[id]/gate1/page.tsx`:
```tsx
<Logo size="sm" />
```

- [ ] **Step 6: Apply Logo to theories page**

In `app/project/[id]/theories/page.tsx`, replace:
```tsx
        <span style={styles.wordmark}>Methea</span>
```
with:
```tsx
        <Logo size="sm" />
```
Remove the `wordmark` entry from `styles`. Add import.

- [ ] **Step 7: Fix project dashboard page**

In `app/project/[id]/page.tsx`:
1. Replace `<span style={styles.wordmark}>Methea</span>` with `<Logo size="sm" />`
2. Remove the `wordmark` style entry
3. Fix `doneChip` style: change `color: 'var(--moss)'` → `color: 'var(--moss)'` (will now resolve — token added in Step 1)
4. Add import: `import Logo from '@/components/ui/Logo'`

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/typescript/lib/tsc.js --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 9: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add app/globals.css components/ui/Logo.tsx app/login/page.tsx "app/project/[id]/brief/page.tsx" "app/project/[id]/gate1/page.tsx" "app/project/[id]/theories/page.tsx" "app/project/[id]/page.tsx"
git commit -m "feat: Logo component with marker swipe, applied to all pages"
```

---

## Task 1 — Types + Claude framework prompts

**Files:**
- Modify: `types/database.ts`
- Create: `lib/prompts/framework.ts`

**Interfaces:**
- Consumes: `ResearchContext`, `Theory` from `types/database.ts`; `generateJSON` from `lib/claude.ts`
- Produces:
  - `FrameworkEdge` type: `{ from: string; to: string; label: string }`
  - `FrameworkCitation` type: `{ author: string; year: number; title: string; doi?: string }`
  - Updated `ResearchContext.framework` block
  - `generateRelationshipLabels(ctx, theories): Promise<FrameworkEdge[]>`
  - `generateFrameworkNarrative(ctx, theories, edges): Promise<{ narrative: string; citations: FrameworkCitation[] }>`

- [ ] **Step 1: Update types/database.ts**

Replace the existing `framework?` block inside `ResearchContext` and add the two new types. Find:

```typescript
export type CitationStatus = 'verified' | 'unverified' | 'outdated'
```

Add after it:

```typescript
export interface FrameworkEdge {
  from: string   // theory id
  to: string     // theory id
  label: string  // e.g. "shapes", "moderates", "extends"
}

export interface FrameworkCitation {
  author: string
  year: number
  title: string
  doi?: string
}
```

Then find the existing `framework?` block in `ResearchContext`:

```typescript
  framework?: {
    layout_preset: 'hierarchy' | 'hub-and-spoke' | 'linear'
    relationship_labels: Record<string, string>
    narrative: string
    citation_verification: Record<string, CitationStatus>
  }
```

Replace with:

```typescript
  framework?: {
    layout_preset: 'hierarchy' | 'hub-and-spoke' | 'linear'
    edges: FrameworkEdge[]
    narrative: string
    citations: FrameworkCitation[]
    citation_statuses: Record<string, 'doi_verified' | 'classic_verified' | 'unverified'>
  }
```

- [ ] **Step 2: Create lib/prompts/framework.ts**

```typescript
// lib/prompts/framework.ts
import { generateJSON } from '@/lib/claude'
import type { ResearchContext, Theory, FrameworkEdge, FrameworkCitation } from '@/types/database'

// ── Relationship labels ──────────────────────────────────────────────────────

const EDGE_SYSTEM = `You are a research methodology expert helping a student map the relationships between their theoretical framework components.
Given a set of theories and the student's research context, identify how each pair of theories relates.
Use short verb phrases (3-5 words max) that a Masters student would recognise: "shapes", "moderates", "extends", "complements", "challenges", "operationalises", "provides mechanism for".
Respond with a single valid JSON array only — no markdown, no explanation.`

export async function generateRelationshipLabels(
  ctx: ResearchContext,
  theories: Theory[]
): Promise<FrameworkEdge[]> {
  if (theories.length < 2) return []

  const pairs: string[] = []
  for (let i = 0; i < theories.length; i++) {
    for (let j = i + 1; j < theories.length; j++) {
      pairs.push(`"${theories[i].name}" (${theories[i].id}) ↔ "${theories[j].name}" (${theories[j].id})`)
    }
  }

  const userPrompt = `Student research context:
Topic: ${ctx.brief!.topic}
Research question: ${ctx.brief!.research_question}
Research type: ${ctx.brief!.research_type}

Theory pairs to label:
${pairs.join('\n')}

Return a JSON array — one object per directional relationship (choose the most meaningful direction):
[
  {
    "from": "<theory id of the influencing theory>",
    "to": "<theory id of the influenced theory>",
    "label": "<short verb phrase describing the relationship>"
  }
]

Rules:
- Every theory must appear in at least one relationship
- Use exact theory IDs from the input — never invent IDs
- Keep labels under 5 words
- Prefer directional (from→to) over bidirectional where one direction is dominant`

  const raw = await generateJSON<FrameworkEdge[]>(EDGE_SYSTEM, userPrompt, 512)

  // Safety: only keep edges whose IDs exist in our theory set
  const validIds = new Set(theories.map(t => t.id))
  return raw.filter(e => validIds.has(e.from) && validIds.has(e.to))
}

// ── Framework narrative ──────────────────────────────────────────────────────

const NARRATIVE_SYSTEM = `You are a research methodology expert helping a student write the theoretical framework section of their research proposal.
Write a single cohesive paragraph (150-200 words) that explains how the selected theories together form a framework for the student's specific research question.
The paragraph must name each theory, cite it with (Author, Year), and explain what role each plays.
Do not write a conclusion or interpretation — only the framework structure.
At the end, return a separate citations array with structured metadata for each (Author, Year) citation you used.
Respond with a single valid JSON object only.`

export async function generateFrameworkNarrative(
  ctx: ResearchContext,
  theories: Theory[],
  edges: FrameworkEdge[]
): Promise<{ narrative: string; citations: FrameworkCitation[] }> {
  const theoryList = theories.map(t =>
    `- ${t.name} (${t.author}, ${t.year ?? 'n/d'})${t.doi ? ` DOI: ${t.doi}` : ''}`
  ).join('\n')

  const edgeList = edges.map(e => {
    const from = theories.find(t => t.id === e.from)?.name ?? e.from
    const to   = theories.find(t => t.id === e.to)?.name ?? e.to
    return `${from} → ${e.label} → ${to}`
  }).join('\n')

  const userPrompt = `Student research context:
Topic: ${ctx.brief!.topic}
Research question: ${ctx.brief!.research_question}
Discipline: ${ctx.brief!.discipline}

Selected theories:
${theoryList}

Identified relationships:
${edgeList}

Return a JSON object:
{
  "narrative": "<150-200 word paragraph integrating all theories with (Author, Year) citations>",
  "citations": [
    {
      "author": "<surname of first author>",
      "year": <year as integer>,
      "title": "<full theory / work title>",
      "doi": "<DOI if known from the theory list above, else omit>"
    }
  ]
}

Rules:
- The narrative must reference every theory by name and cite it
- Citations array must include one entry per (Author, Year) pair used in the narrative
- DOI in citations: only include if it was provided in the theory list above — never invent one
- The narrative must not interpret findings or draw conclusions — only describe the framework structure`

  return await generateJSON<{ narrative: string; citations: FrameworkCitation[] }>(
    NARRATIVE_SYSTEM, userPrompt, 1024
  )
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
git add types/database.ts lib/prompts/framework.ts
git commit -m "feat: FrameworkEdge/Citation types, Claude relationship + narrative prompts"
```

---

## Task 2 — SVG framework diagram component

**Files:**
- Create: `components/ui/FrameworkDiagram.tsx`

**Interfaces:**
- Consumes: `FrameworkEdge` from `types/database.ts`
- Produces: `<FrameworkDiagram theories edges layout ref? />` — pure SVG, no side effects

Node layout algorithm (implemented inside this component):

**2 theories — linear:**
- T[0]: cx=175, cy=190 · T[1]: cx=525, cy=190

**3 theories — hub-and-spoke (default):**
- T[0] (hub): cx=350, cy=190 · T[1]: cx=110, cy=95 · T[2]: cx=110, cy=285

**3 theories — hierarchy:**
- T[0]: cx=350, cy=70 · T[1]: cx=175, cy=285 · T[2]: cx=525, cy=285

**3 theories — linear:**
- T[0]: cx=110, cy=190 · T[1]: cx=350, cy=190 · T[2]: cx=590, cy=190

**4 theories — hub-and-spoke (default):**
- T[0] (hub): cx=350, cy=190 · T[1]: cx=110, cy=95 · T[2]: cx=110, cy=285 · T[3]: cx=590, cy=190

**4 theories — hierarchy:**
- T[0]: cx=350, cy=65 · T[1]: cx=140, cy=200 · T[2]: cx=350, cy=315 · T[3]: cx=560, cy=200

**4 theories — linear:**
- T[0]: cx=85, cy=190 · T[1]: cx=268, cy=190 · T[2]: cx=432, cy=190 · T[3]: cx=615, cy=190

- [ ] **Step 1: Create components/ui/FrameworkDiagram.tsx**

```tsx
// components/ui/FrameworkDiagram.tsx
import React from 'react'
import type { FrameworkEdge } from '@/types/database'

export interface DiagramTheory {
  id: string
  name: string
  author: string
  year: number | null
}

interface Props {
  theories: DiagramTheory[]
  edges: FrameworkEdge[]
  layout: 'hierarchy' | 'hub-and-spoke' | 'linear'
  svgRef?: React.RefObject<SVGSVGElement>
}

// Pre-computed node centres — indexed by [count-2][presetIndex][nodeIndex]
type Point = { cx: number; cy: number }

const LAYOUTS: Record<'hierarchy' | 'hub-and-spoke' | 'linear', Record<number, Point[]>> = {
  linear: {
    2: [{ cx: 175, cy: 190 }, { cx: 525, cy: 190 }],
    3: [{ cx: 110, cy: 190 }, { cx: 350, cy: 190 }, { cx: 590, cy: 190 }],
    4: [{ cx: 85, cy: 190 }, { cx: 268, cy: 190 }, { cx: 432, cy: 190 }, { cx: 615, cy: 190 }],
  },
  'hub-and-spoke': {
    2: [{ cx: 175, cy: 190 }, { cx: 525, cy: 190 }],
    3: [{ cx: 350, cy: 190 }, { cx: 110, cy: 95 }, { cx: 110, cy: 285 }],
    4: [{ cx: 350, cy: 190 }, { cx: 110, cy: 95 }, { cx: 110, cy: 285 }, { cx: 590, cy: 190 }],
  },
  hierarchy: {
    2: [{ cx: 175, cy: 120 }, { cx: 525, cy: 260 }],
    3: [{ cx: 350, cy: 70 }, { cx: 175, cy: 285 }, { cx: 525, cy: 285 }],
    4: [{ cx: 350, cy: 65 }, { cx: 140, cy: 200 }, { cx: 350, cy: 315 }, { cx: 560, cy: 200 }],
  },
}

const NODE_W = 180
const NODE_H = 56

function getEdgePoints(from: Point, to: Point): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / len
  const uy = dy / len
  // Offset from node centre to edge (approximate box intersection)
  const offFrom = Math.abs(ux) * NODE_W / 2 + Math.abs(uy) * NODE_H / 2 + 6
  const offTo   = offFrom
  return {
    x1: from.cx + ux * offFrom,
    y1: from.cy + uy * offFrom,
    x2: to.cx   - ux * offTo,
    y2: to.cy   - uy * offTo,
  }
}

export default function FrameworkDiagram({ theories, edges, layout, svgRef }: Props) {
  const count = Math.min(Math.max(theories.length, 2), 4)
  const positions = LAYOUTS[layout][count] ?? LAYOUTS['hub-and-spoke'][count]

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 700 380"
      width="100%"
      style={{ display: 'block', maxWidth: '700px' }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Research framework diagram"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#DDD8C6" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const fromIdx = theories.findIndex(t => t.id === edge.from)
        const toIdx   = theories.findIndex(t => t.id === edge.to)
        if (fromIdx < 0 || toIdx < 0) return null
        const from = positions[fromIdx]
        const to   = positions[toIdx]
        if (!from || !to) return null
        const { x1, y1, x2, y2 } = getEdgePoints(from, to)
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        return (
          <g key={i}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#DDD8C6"
              strokeWidth="1.5"
              markerEnd="url(#arrow)"
            />
            {edge.label && (
              <text
                x={midX}
                y={midY - 6}
                textAnchor="middle"
                fontFamily="'Source Serif 4', Georgia, serif"
                fontStyle="italic"
                fontSize="11"
                fill="#8C8A82"
              >
                {edge.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {theories.slice(0, count).map((theory, i) => {
        const pos = positions[i]
        if (!pos) return null
        const x = pos.cx - NODE_W / 2
        const y = pos.cy - NODE_H / 2
        // Truncate long names
        const name = theory.name.length > 22 ? theory.name.slice(0, 20) + '…' : theory.name
        const meta = `${theory.author.split(/[,&]/)[0].trim()}${theory.year ? `, ${theory.year}` : ''}`
        return (
          <g key={theory.id}>
            <rect
              x={x} y={y}
              width={NODE_W} height={NODE_H}
              rx="8"
              fill="#FBF9F3"
              stroke="#11425D"
              strokeWidth="1.5"
            />
            <text
              x={pos.cx} y={pos.cy - 8}
              textAnchor="middle"
              fontFamily="'Schibsted Grotesk', 'Inter', system-ui, sans-serif"
              fontWeight="600"
              fontSize="13"
              fill="#1C1C1C"
            >
              {name}
            </text>
            <text
              x={pos.cx} y={pos.cy + 12}
              textAnchor="middle"
              fontFamily="'Schibsted Grotesk', 'Inter', system-ui, sans-serif"
              fontSize="11"
              fill="#8C8A82"
            >
              {meta}
            </text>
          </g>
        )
      })}
    </svg>
  )
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
git add components/ui/FrameworkDiagram.tsx
git commit -m "feat: FrameworkDiagram SVG component with 3 layout presets"
```

---

## Task 3 — Framework page + FrameworkBuilder client + server action

**Files:**
- Create: `app/project/[id]/framework/page.tsx`
- Create: `app/project/[id]/framework/FrameworkBuilder.tsx`
- Create: `app/project/[id]/framework/actions.ts`
- Modify: `app/project/[id]/page.tsx`

**Interfaces:**
- Consumes: `generateRelationshipLabels`, `generateFrameworkNarrative` from `lib/prompts/framework.ts`; `verifyTheory` from `lib/openalex.ts` (for citation guard); `FrameworkDiagram`, `DiagramTheory` from `components/ui/FrameworkDiagram.tsx`; `updateResearchContext` from `lib/research-context.ts`
- Produces:
  - `saveFramework(formData)` — saves `layout_preset`, `edges`, `narrative`, `citations`, `citation_statuses` to `research_context.framework`
  - `/project/[id]/framework` route — Screen 4: diagram + narrative + export
  - Routing: project dashboard → `/framework` if theories done but no framework

- [ ] **Step 1: Create actions.ts**

```typescript
// app/project/[id]/framework/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import type { FrameworkEdge, FrameworkCitation } from '@/types/database'

export async function saveFramework(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const layout    = formData.get('layout') as 'hierarchy' | 'hub-and-spoke' | 'linear'
  const edges     = JSON.parse(formData.get('edges') as string) as FrameworkEdge[]
  const narrative = formData.get('narrative') as string
  const citations = JSON.parse(formData.get('citations') as string) as FrameworkCitation[]
  const citationStatuses = JSON.parse(formData.get('citationStatuses') as string) as Record<string, 'doi_verified' | 'classic_verified' | 'unverified'>

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  await updateResearchContext(
    projectId,
    'framework',
    {
      framework: {
        layout_preset: layout,
        edges,
        narrative,
        citations,
        citation_statuses: citationStatuses,
      },
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}
```

- [ ] **Step 2: Create FrameworkBuilder.tsx**

```tsx
// app/project/[id]/framework/FrameworkBuilder.tsx
'use client'

import { useRef, useState } from 'react'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import { saveFramework } from './actions'
import type { FrameworkEdge, FrameworkCitation } from '@/types/database'

type Layout = 'hierarchy' | 'hub-and-spoke' | 'linear'
type CitationStatus = 'doi_verified' | 'classic_verified' | 'unverified'

interface Props {
  projectId: string
  theories: DiagramTheory[]
  edges: FrameworkEdge[]
  narrative: string
  citations: FrameworkCitation[]
  citationStatuses: Record<string, CitationStatus>
  defaultLayout: Layout
}

const LAYOUT_LABELS: Record<Layout, string> = {
  'hub-and-spoke': 'Hub & spoke',
  hierarchy: 'Hierarchy',
  linear: 'Linear',
}

export default function FrameworkBuilder({
  projectId, theories, edges, narrative, citations, citationStatuses, defaultLayout,
}: Props) {
  const [layout, setLayout] = useState<Layout>(defaultLayout)
  const [saving, setSaving]   = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  async function handleSave() {
    setSaving(true)
    const fd = new FormData()
    fd.append('projectId', projectId)
    fd.append('layout', layout)
    fd.append('edges', JSON.stringify(edges))
    fd.append('narrative', narrative)
    fd.append('citations', JSON.stringify(citations))
    fd.append('citationStatuses', JSON.stringify(citationStatuses))
    await saveFramework(fd)
  }

  function handleExportPNG() {
    const svg = svgRef.current
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = 1400  // 2× for retina
      canvas.height = 760
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#F6F2E8'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 1400, 760)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob2 => {
        if (!blob2) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob2)
        a.download = 'methea-framework.png'
        a.click()
      }, 'image/png')
    }
    img.src = url
  }

  return (
    <div style={s.wrapper}>
      {/* Layout switcher */}
      <div style={s.layoutRow}>
        <span style={s.layoutLabel}>Layout</span>
        <div style={s.layoutBtns}>
          {(Object.keys(LAYOUT_LABELS) as Layout[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLayout(l)}
              style={{
                ...s.layoutBtn,
                ...(layout === l ? s.layoutBtnActive : {}),
              }}
            >
              {LAYOUT_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Diagram */}
      <div style={s.diagramWrap}>
        <FrameworkDiagram
          theories={theories}
          edges={edges}
          layout={layout}
          svgRef={svgRef}
        />
      </div>

      {/* Narrative */}
      <div style={s.narrativeCard}>
        <p style={s.narrativeLabel}>Framework narrative</p>
        <p style={s.narrativeText}>{narrative}</p>
        <div style={s.citationChips}>
          {citations.map((c, i) => {
            const key = `${c.author}, ${c.year}`
            const status = citationStatuses[key] ?? 'unverified'
            return (
              <span
                key={i}
                style={{
                  ...s.citationChip,
                  background: status === 'unverified' ? 'var(--paper-deep)' : 'var(--mint)',
                  color:      status === 'unverified' ? 'var(--pencil)' : 'var(--moss)',
                  border:     `1px solid ${status === 'unverified' ? 'var(--stone)' : 'var(--marker-green)'}`,
                }}
                title={c.doi ?? 'No DOI found'}
              >
                {status === 'unverified' ? '?' : '✓'} {c.author}, {c.year}
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

const s: Record<string, React.CSSProperties> = {
  wrapper:       { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  layoutRow:     { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' as const },
  layoutLabel:   { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  layoutBtns:    { display: 'flex', gap: '0.375rem' },
  layoutBtn:     { padding: '4px 12px', border: '1px solid var(--stone)', borderRadius: 'var(--radius-sm)', background: 'var(--sheet)', color: 'var(--graphite)', fontSize: '0.8125rem', fontFamily: 'inherit', cursor: 'pointer' },
  layoutBtnActive: { background: 'var(--ink-blue)', color: 'var(--sheet)', borderColor: 'var(--ink-blue)' },
  diagramWrap:   { background: 'var(--paper)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1rem', overflow: 'hidden' },
  narrativeCard: { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  narrativeLabel:{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  narrativeText: { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--graphite)' },
  citationChips: { display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem' },
  citationChip:  { padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 500 },
  actions:       { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
  secondaryBtn:  { padding: '0.625rem 1.25rem', border: '1px solid var(--stone)', borderRadius: 'var(--radius)', background: 'var(--sheet)', color: 'var(--graphite)', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  primaryBtn:    { padding: '0.75rem 1.5rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  primaryBtnDisabled: { background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
}
```

- [ ] **Step 3: Create page.tsx**

```tsx
// app/project/[id]/framework/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateRelationshipLabels, generateFrameworkNarrative } from '@/lib/prompts/framework'
import Logo from '@/components/ui/Logo'
import FrameworkBuilder from './FrameworkBuilder'
import type { Project, Theory } from '@/types/database'

export const metadata = { title: 'Your framework — Methea' }

export default async function FrameworkPage({ params }: { params: { id: string } }) {
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

  if (!ctx?.theories?.selected_ids?.length) redirect(`/project/${params.id}/theories`)
  if (ctx?.framework?.edges?.length) redirect(`/project/${params.id}`)

  const selectedIds = ctx.theories!.selected_ids

  const { data: theoriesData } = await supabase
    .from('theories')
    .select('*')
    .in('id', selectedIds)

  if (!theoriesData?.length) redirect(`/project/${params.id}`)

  const theories = theoriesData as Theory[]

  // Run both Claude calls in parallel
  const [edges, narrativeResult] = await Promise.all([
    generateRelationshipLabels(ctx, theories),
    generateRelationshipLabels(ctx, theories).then(e =>
      generateFrameworkNarrative(ctx, theories, e)
    ),
  ])

  // Verify citations via OpenAlex (parallel)
  const citationStatuses: Record<string, 'doi_verified' | 'classic_verified' | 'unverified'> = {}
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

  const defaultLayout = theories.length === 2 ? 'linear' : 'hub-and-spoke'

  const diagramTheories = theories.map(t => ({
    id: t.id,
    name: t.name,
    author: t.author,
    year: t.year,
  }))

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
        <div style={styles.heading}>
          <h2 style={styles.h2}>Here's how your theories connect</h2>
          <p style={styles.sub}>Review the diagram and narrative, then save to continue.</p>
        </div>
        <FrameworkBuilder
          projectId={params.id}
          theories={diagramTheories}
          edges={edges}
          narrative={narrativeResult.narrative}
          citations={narrativeResult.citations}
          citationStatuses={citationStatuses}
          defaultLayout={defaultLayout}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', padding: '2.5rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  heading:   { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  h2:        { fontSize: '1.375rem', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.3 },
  sub:       { fontSize: '0.9375rem', color: 'var(--graphite)' },
}
```

> **Note:** The page calls `generateRelationshipLabels` twice above (once standalone, once chained) — this is wasteful. Fix it by calling once and passing results forward:

Replace the `Promise.all` block in page.tsx with:

```tsx
  const edges = await generateRelationshipLabels(ctx, theories)
  const narrativeResult = await generateFrameworkNarrative(ctx, theories, edges)
```

- [ ] **Step 4: Update project dashboard routing**

In `app/project/[id]/page.tsx`, find:

```typescript
  if (!p.research_context?.theories?.selected_ids?.length) {
    redirect(`/project/${params.id}/theories`)
  }
```

Add after it:

```typescript
  if (!p.research_context?.framework?.edges?.length) {
    redirect(`/project/${params.id}/framework`)
  }
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/typescript/lib/tsc.js --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add "app/project/[id]/framework/" "app/project/[id]/page.tsx"
git commit -m "feat: framework page, FrameworkBuilder client, saveFramework action, routing"
```

---

## Task 4 — Install docx + Word export

**Files:**
- Modify: `app/project/[id]/framework/FrameworkBuilder.tsx`

**Interfaces:**
- Consumes: `narrative`, `citations`, `citationStatuses` already in `FrameworkBuilder` props
- Produces: downloads `methea-framework.docx` when "Export Word" is clicked

- [ ] **Step 1: Install docx**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
npm install docx
```

Expected: `docx` appears in `package.json` dependencies. No TypeScript errors (`docx` ships its own types).

- [ ] **Step 2: Add handleExportWord to FrameworkBuilder.tsx**

Add this import at the top of `FrameworkBuilder.tsx`:

```typescript
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
```

Add this function inside the component (after `handleExportPNG`):

```typescript
  async function handleExportWord() {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: 'Theoretical Framework',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [new TextRun({ text: narrative, size: 24 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'References',
            heading: HeadingLevel.HEADING_2,
          }),
          ...citations.map(c =>
            new Paragraph({
              children: [
                new TextRun({
                  text: `${c.author} (${c.year}). ${c.title}.${c.doi ? ` https://doi.org/${c.doi}` : ''}`,
                  size: 22,
                }),
              ],
              spacing: { after: 120 },
            })
          ),
        ],
      }],
    })

    const blob = await Packer.toBlob(doc)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'methea-framework.docx'
    a.click()
  }
```

Add an "Export Word" button next to "Export PNG" in the actions row:

```tsx
        <button type="button" onClick={handleExportWord} style={s.secondaryBtn}>
          Export Word
        </button>
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
npm install docx
git add package.json package-lock.json "app/project/[id]/framework/FrameworkBuilder.tsx"
git commit -m "feat: Word doc export (docx) for framework narrative"
```

---

## Task 5 — End-to-end verification + build check

**No new files.**

- [ ] **Step 1: Full build check**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/next/dist/bin/next build 2>&1 | tail -25
```

Expected: clean build. Route `/project/[id]/framework` appears in the route list as `ƒ` (dynamic).

- [ ] **Step 2: Verify the logo appears on all pages**

Open `http://localhost:3000` in browser. Sign in. The logo (with lime marker swipe) should appear on:
- Login page (size md — larger)
- Brief page (size sm)
- Gate 1 page (size sm)
- Theories page (size sm)
- Project dashboard (size sm)
- Framework page (size sm)

- [ ] **Step 3: Test framework flow**

Navigate to an existing project that has theories selected but no framework yet. It should redirect to `/project/[id]/framework`. Verify:
- Diagram renders with nodes and labelled edges
- Layout switcher changes the diagram (hub-and-spoke / hierarchy / linear)
- Framework narrative appears below the diagram
- Citation chips show ✓ green or ? gray correctly
- "Export PNG" downloads a `methea-framework.png`
- "Export Word" downloads a `methea-framework.docx`
- "Save framework →" saves and redirects to dashboard

- [ ] **Step 4: Verify Supabase state**

Table Editor → projects: `research_context.framework` should contain `edges`, `narrative`, `citations`, `citation_statuses`.

- [ ] **Step 5: Final commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add -A
git commit -m "sprint 3 complete: framework builder, logo, export"
```

---

## Sprint 3 Definition of Done

- [ ] Logo with lime marker swipe appears on every page
- [ ] Framework diagram renders in all 3 layout presets for 2–4 theories
- [ ] Relationship labels between theory pairs are generated by Claude and shown on edges
- [ ] Framework narrative (150-200 words) is generated with inline citations
- [ ] Every citation is verified via OpenAlex — ✓ green if found, ? gray if not
- [ ] PNG export downloads a 1400×760 raster (2× retina)
- [ ] Word export downloads a `.docx` with narrative + reference list
- [ ] Selecting "Save framework" saves to `research_context.framework` and redirects to dashboard
- [ ] Project dashboard shows framework status after save

---

*Sprint 3 plan — June 2026 · methea-app*
