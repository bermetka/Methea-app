# Sprint 1 — Brief Upload + Socratic Gate 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Student fills in their research topic, degree level, and discipline → Claude extracts a structured brief + generates 4 Socratic questions → student answers all 4 → structured brief is saved to `research_context` in Supabase.

**Architecture:** Two new sub-routes under `/project/[id]`: `/brief` (Screen 1) and `/gate1` (Screen 2). Server actions call Claude via `lib/claude.ts` `generateJSON<T>()`. The project page redirects to `/brief` if no brief exists yet; after gate 1 completes it redirects back to `/project/[id]`. All AI output is saved to `research_context` via a shared `updateResearchContext()` helper that also writes a version snapshot to `research_context_versions`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (`@supabase/ssr`), Claude API (`@anthropic-ai/sdk`), `mammoth` (docx parsing), `pdf-parse` (PDF parsing), inline CSS (no Tailwind — matches Sprint 0 pattern).

## Global Constraints

- Single column, max-width 720px (Screen 2) / 600px (Screen 1 card), 13" laptop first
- Fonts: Playfair Display (headings), Schibsted Grotesk (UI), Source Serif 4 (long-form) — loaded via Google Fonts in `globals.css`
- Colors: `--paper #F6F2E8`, `--sheet #FBF9F3`, `--ink #1C1C1C`, `--graphite #4A4A47`, `--pencil #8C8A82`, `--ink-blue #11425D`, `--ink-blue-deep #002233`, `--stone-soft #E9E4D6`, `--stone #DDD8C6`, `--marker-lime #DDFF55`, `--marker-green #B7F171`, `--error #B3413B`, `--error-bg #F4E3E0`
- Buttons: 10px radius, 12px vertical / 20px horizontal padding, Schibsted Grotesk 600, no uppercase
- Inputs: `--sheet` bg, 1px `--stone-soft` border, 10px radius, 12px/16px padding, focus border `--ink-blue` (no glow)
- Cards: `--sheet` bg, 1px `--stone-soft` border, 10px radius, 24px padding, no shadow
- Error copy: guidance tone, never accusatory — e.g. "A sentence or two helps..." not "Topic required"
- No toasts or modals — all errors inline in the field
- `research_context` is the single source of truth — frontend never constructs the final shape, only hands raw answers to server actions
- Theory library is closed and curated — Claude never invents author names or citations
- All Claude calls use `generateJSON<T>()` from `lib/claude.ts` — never call `anthropic` directly from a page or action
- Install `mammoth` and `pdf-parse` before starting Task 1

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `lib/research-context.ts` | **Create** | `updateResearchContext()` — reads current, saves version snapshot, writes new context |
| `lib/prompts/brief.ts` | **Create** | `extractBrief()` and `generateSocraticQuestions()` Claude prompt functions |
| `components/ui/RadioCard.tsx` | **Create** | Reusable radio-card component used in Screen 2 (and later Screen 3) |
| `components/ui/StatusChip.tsx` | **Create** | Verified/unverified/outdated chip — used across all screens |
| `app/project/[id]/brief/page.tsx` | **Create** | Screen 1 server component — auth check, redirect if brief exists |
| `app/project/[id]/brief/BriefForm.tsx` | **Create** | Screen 1 client component — all form state and interaction |
| `app/project/[id]/brief/actions.ts` | **Create** | `submitBrief()` server action — calls Claude, saves to research_context |
| `app/project/[id]/gate1/page.tsx` | **Create** | Screen 2 server component — loads questions from research_context |
| `app/project/[id]/gate1/Gate1Form.tsx` | **Create** | Screen 2 client component — 4-step radio-card flow |
| `app/project/[id]/gate1/actions.ts` | **Create** | `submitGate1()` server action — saves gate1 answers to research_context |
| `app/project/[id]/page.tsx` | **Modify** | Add redirect to `/brief` if `research_context.brief` is absent |
| `app/globals.css` | **Modify** | Add missing color tokens, Source Serif 4 font import |
| `types/database.ts` | **Modify** | Add `ClarificationQuestion` type, `SocraticGate1Response` |

---

## Task 1 — Install dependencies + add missing CSS tokens

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `mammoth` and `pdf-parse` available for import; all color tokens available as CSS custom properties

- [ ] **Step 1: Install mammoth and pdf-parse**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
npm install mammoth pdf-parse
npm install --save-dev @types/pdf-parse
```

Expected: packages added to `node_modules`, no errors.

- [ ] **Step 2: Update globals.css with full brand token set and font imports**

Replace the `:root` block and font imports in `app/globals.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Source+Serif+4:ital,wght@0,400;1,400&family=Caveat:wght@500;600&display=swap');

:root {
  /* Paper family — backgrounds */
  --paper:        #F6F2E8;
  --sheet:        #FBF9F3;
  --paper-deep:   #EDE7D8;

  /* Stone — borders */
  --stone:        #DDD8C6;
  --stone-soft:   #E9E4D6;

  /* Ink family — text */
  --ink:          #1C1C1C;
  --graphite:     #4A4A47;
  --pencil:       #8C8A82;
  --ink-blue:     #11425D;
  --ink-blue-deep:#002233;

  /* Marker — highlights only */
  --marker-yellow:#FFE66D;
  --marker-lime:  #DDFF55;
  --marker-green: #B7F171;

  /* Semantic */
  --sky:          #C0D6EA;
  --verified-text:#2E7D4F;
  --warn-text:    #6B5500;
  --error:        #B3413B;
  --error-bg:     #F4E3E0;

  /* Layout */
  --max-width: 720px;
  --radius-sm: 6px;
  --radius:    10px;
  --radius-lg: 14px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; }

body {
  background: var(--paper);
  color: var(--ink);
  font-family: 'Schibsted Grotesk', 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; }
h1 { font-size: clamp(2rem, 5vw, 4rem); font-weight: 400; line-height: 1.1; letter-spacing: -0.025em; }
h2 { font-size: clamp(1.375rem, 3vw, 2rem); font-weight: 400; line-height: 1.2; letter-spacing: -0.015em; }
h3 { font-family: 'Schibsted Grotesk', 'Inter', system-ui, sans-serif; font-size: 1.125rem; font-weight: 600; line-height: 1.3; }

a { color: var(--ink-blue); text-decoration: none; }
a:hover { text-decoration: underline; }
```

- [ ] **Step 3: Verify dev server starts without CSS errors**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/next/dist/bin/next build 2>&1 | tail -15
```

Expected: clean build, all routes listed, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add app/globals.css package.json package-lock.json
git commit -m "feat: install mammoth/pdf-parse, add full brand token set to globals.css"
```

---

## Task 2 — Types + research context helper + Claude prompt functions

**Files:**
- Modify: `types/database.ts`
- Create: `lib/research-context.ts`
- Create: `lib/prompts/brief.ts`

**Interfaces:**
- Produces:
  - `ClarificationQuestion` type
  - `updateResearchContext(projectId, block, patch, supabase)` — call this from every server action
  - `extractBrief(topic, degreeLevel, discipline, readingList?, fileText?)` → `Promise<BriefExtraction>`
  - `generateSocraticQuestions(brief: BriefExtraction)` → `Promise<ClarificationQuestion[]>`

- [ ] **Step 1: Add types to types/database.ts**

Append to the bottom of `types/database.ts`:

```typescript
export interface ClarificationQuestion {
  id: string
  prompt: string
  options: { value: string; title: string; description: string }[]
}

export interface BriefExtraction {
  topic: string
  research_question: string
  research_type: ResearchType
  constraints: string[]
  degree_level: string
  discipline: string
}

export interface SocraticGate1Response {
  completed: boolean
  responses: Record<string, string>  // questionId → selected option value
}
```

- [ ] **Step 2: Create lib/research-context.ts**

```typescript
// lib/research-context.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ResearchContext } from '@/types/database'

/**
 * Atomically updates one block of research_context, increments the version,
 * and writes a snapshot to research_context_versions.
 *
 * All server actions that touch research_context must go through this —
 * never write to the projects table directly.
 */
export async function updateResearchContext(
  projectId: string,
  changedBlock: string,
  patch: Partial<ResearchContext>,
  supabase: SupabaseClient
): Promise<ResearchContext> {
  // 1. Read current context
  const { data: project, error: readError } = await supabase
    .from('projects')
    .select('research_context, context_version')
    .eq('id', projectId)
    .single()

  if (readError || !project) {
    throw new Error(`Could not read project: ${readError?.message}`)
  }

  const current: ResearchContext = project.research_context
  const newVersion = (project.context_version as number) + 1

  const updated: ResearchContext = {
    ...current,
    ...patch,
    version: newVersion,
  }

  // 2. Write version snapshot
  await supabase.from('research_context_versions').insert({
    project_id: projectId,
    version: newVersion,
    context_snapshot: updated,
    changed_block: changedBlock,
  })

  // 3. Update project
  const { error: writeError } = await supabase
    .from('projects')
    .update({
      research_context: updated,
      context_version: newVersion,
    })
    .eq('id', projectId)

  if (writeError) {
    throw new Error(`Could not update research_context: ${writeError.message}`)
  }

  return updated
}
```

- [ ] **Step 3: Create lib/prompts/brief.ts**

```typescript
// lib/prompts/brief.ts
import { generateJSON } from '@/lib/claude'
import type { BriefExtraction, ClarificationQuestion, ResearchType } from '@/types/database'

const EXTRACT_BRIEF_SYSTEM = `You are a research methodology assistant helping Masters and PhD students structure their research.
Given a student's topic description and context, extract a structured research brief.
Respond with a single valid JSON object — no markdown, no explanation, just the JSON.`

export async function extractBrief(
  topic: string,
  degreeLevel: string,
  discipline: string,
  readingList?: string,
  fileText?: string
): Promise<BriefExtraction> {
  const contextParts = [
    `Topic description: ${topic}`,
    `Degree level: ${degreeLevel}`,
    `Discipline: ${discipline}`,
    readingList ? `Reading list (optional): ${readingList}` : null,
    fileText ? `Assignment brief / TOR text (optional): ${fileText}` : null,
  ].filter(Boolean).join('\n\n')

  const userPrompt = `${contextParts}

Extract a structured research brief. Return this exact JSON shape:
{
  "topic": "short phrase (5-10 words) naming the research subject",
  "research_question": "one clear research question implied by the topic, phrased as a question",
  "research_type": "exploratory" | "explanatory" | "descriptive",
  "constraints": ["list", "of", "implicit constraints from the brief — e.g. geography, time period, population, access"],
  "degree_level": "${degreeLevel}",
  "discipline": "${discipline}"
}

Research type guide:
- exploratory: seeks to understand a phenomenon ("how/why do X happen?")
- explanatory: tests causal relationships ("does X cause Y?")
- descriptive: maps the extent or distribution of something ("how widespread is X?")

Be concise. The research_question should be one sentence. constraints may be empty [] if none are apparent.`

  return generateJSON<BriefExtraction>(EXTRACT_BRIEF_SYSTEM, userPrompt, 512)
}

const GATE1_SYSTEM = `You are a research methodology assistant. Your job is to ask 4 targeted clarifying questions that help sharpen a student's research question and confirm the right methodology direction.
Generate questions that are specific to their topic — never generic.
Each question has exactly 3 options. Options must be clearly distinct.
Respond with a single valid JSON array — no markdown, no explanation, just the JSON.`

export async function generateSocraticQuestions(
  brief: BriefExtraction
): Promise<ClarificationQuestion[]> {
  const userPrompt = `Research brief:
Topic: ${brief.topic}
Research question: ${brief.research_question}
Research type: ${brief.research_type}
Discipline: ${brief.discipline}
Degree level: ${brief.degree_level}

Generate exactly 4 clarifying questions to sharpen this research question. The questions should address:
1. Whether the focus is understanding WHY vs. measuring HOW MUCH (methodology direction)
2. The scope — who/what is being studied and at what scale
3. The student's access to data/participants
4. Any key assumption in the research question worth surfacing

Return a JSON array with exactly 4 items, each matching this shape:
[
  {
    "id": "q1",
    "prompt": "the question itself — specific to their topic, not generic",
    "options": [
      { "value": "option_value_snake_case", "title": "Short title (3-5 words)", "description": "One sentence explaining what this means for their research" },
      { "value": "option_value_snake_case", "title": "Short title", "description": "One sentence" },
      { "value": "option_value_snake_case", "title": "Short title", "description": "One sentence" }
    ]
  }
]

IDs must be "q1", "q2", "q3", "q4". Option values must be unique within each question. Questions must feel co-constructive ("Is this more about X or Y?"), never interrogative ("Enter your scope.").`

  return generateJSON<ClarificationQuestion[]>(GATE1_SYSTEM, userPrompt, 1024)
}
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
git add types/database.ts lib/research-context.ts lib/prompts/brief.ts
git commit -m "feat: add brief extraction types, research-context helper, Claude prompt functions"
```

---

## Task 3 — Shared UI components: RadioCard + StatusChip

**Files:**
- Create: `components/ui/RadioCard.tsx`
- Create: `components/ui/StatusChip.tsx`

**Interfaces:**
- Produces:
  - `<RadioCard option={...} selected={boolean} onSelect={() => void} />` — used in Gate1Form
  - `<StatusChip status={VerificationStatus} />` — used in theory cards (Sprint 2+), wired up now

- [ ] **Step 1: Create components/ui/RadioCard.tsx**

```tsx
// components/ui/RadioCard.tsx
'use client'

interface RadioOption {
  value: string
  title: string
  description: string
}

interface RadioCardProps {
  option: RadioOption
  selected: boolean
  onSelect: () => void
}

export default function RadioCard({ option, selected, onSelect }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        width: '100%',
        padding: '1rem 1.25rem',
        background: 'var(--sheet)',
        border: `1px solid ${selected ? 'var(--ink-blue)' : 'var(--stone-soft)'}`,
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.1s',
      }}
      aria-pressed={selected}
    >
      {/* Radio dot */}
      <span style={{
        flexShrink: 0,
        marginTop: '3px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: `2px solid ${selected ? 'var(--ink-blue)' : 'var(--stone)'}`,
        background: selected ? 'var(--ink-blue)' : 'transparent',
        boxShadow: selected ? 'inset 0 0 0 3px var(--sheet)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }} />
      <div>
        <p style={{
          fontWeight: 600,
          fontSize: '0.9375rem',
          color: 'var(--ink)',
          marginBottom: '0.25rem',
        }}>
          {option.title}
        </p>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--graphite)',
          lineHeight: 1.5,
        }}>
          {option.description}
        </p>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Create components/ui/StatusChip.tsx**

```tsx
// components/ui/StatusChip.tsx
interface DoiVerified { kind: 'doi_verified'; doi: string }
interface ClassicVerified { kind: 'classic_verified'; source: string }
interface Unverified { kind: 'unverified' }

export type VerificationStatus = DoiVerified | ClassicVerified | Unverified

interface StatusChipProps {
  status: VerificationStatus
}

export default function StatusChip({ status }: StatusChipProps) {
  const config = {
    doi_verified:     { bg: 'var(--marker-green)', text: 'var(--verified-text)', icon: '✓', label: 'Verified · DOI found' },
    classic_verified: { bg: 'var(--marker-green)', text: 'var(--verified-text)', icon: '✓', label: 'Verified · Classic text' },
    unverified:       { bg: 'var(--stone-soft)',   text: 'var(--pencil)',        icon: '?', label: 'Unverified — check manually' },
  }[status.kind]

  const tooltip = status.kind === 'doi_verified'
    ? `DOI: ${status.doi}`
    : status.kind === 'classic_verified'
    ? `Source: ${status.source}`
    : 'No DOI found — verify this source manually'

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '2px 8px',
        background: config.bg,
        color: config.text,
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        fontWeight: 500,
        cursor: 'help',
      }}
    >
      {config.icon} {config.label}
    </span>
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
git add components/
git commit -m "feat: add RadioCard and StatusChip shared components"
```

---

## Task 4 — Screen 1: BriefForm client component

**Files:**
- Create: `app/project/[id]/brief/BriefForm.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (purely UI, mock submission)
- Produces: `<BriefForm projectId={string} />` — renders full Screen 1, calls `submitBrief` server action on submit

- [ ] **Step 1: Create app/project/[id]/brief/BriefForm.tsx**

```tsx
'use client'

import { useRef, useState } from 'react'
import { submitBrief } from './actions'

const DEGREE_LEVELS = [
  { value: 'bachelor', label: "Bachelor's" },
  { value: 'masters',  label: "Master's" },
  { value: 'phd',      label: 'PhD' },
  { value: 'independent', label: 'Independent researcher' },
]

const DISCIPLINES = [
  'Business & Management', 'Economics', 'Education', 'Engineering',
  'Health Sciences', 'Information Systems', 'Law', 'Political Science',
  'Psychology', 'Public Administration', 'Sociology', 'Other',
]

interface Props { projectId: string }

export default function BriefForm({ projectId }: Props) {
  const [topic, setTopic]           = useState('')
  const [degree, setDegree]         = useState('')
  const [discipline, setDiscipline] = useState('')
  const [showReading, setShowReading] = useState(false)
  const [showUpload, setShowUpload]   = useState(false)
  const [readingList, setReadingList] = useState('')
  const [file, setFile]             = useState<File | null>(null)
  const [status, setStatus]         = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const isValid = topic.trim().length >= 10 && degree !== '' && discipline !== ''

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (topic.trim().length < 10)
      e.topic = 'A sentence or two helps me understand what you\'re after — try adding a bit more.'
    if (!degree)
      e.degree = 'Please select your degree level so I can tailor the methodology guidance.'
    if (!discipline)
      e.discipline = 'Knowing your discipline helps match the right theoretical traditions.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setStatus('submitting')

    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('topic', topic.trim())
    formData.append('degreeLevel', degree)
    formData.append('discipline', discipline)
    if (readingList.trim()) formData.append('readingList', readingList.trim())
    if (file) formData.append('file', file)

    try {
      await submitBrief(formData)
      // submitBrief redirects on success — if we get here, something went wrong
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={s.card}>
      {/* Topic */}
      <div>
        <textarea
          value={topic}
          onChange={e => { setTopic(e.target.value); setErrors(prev => ({ ...prev, topic: '' })) }}
          placeholder='e.g. "How do solo founders in Central Asia decide when to raise outside funding?"'
          rows={4}
          style={{
            ...s.textarea,
            ...(errors.topic ? s.inputError : topic.trim() ? s.inputFilled : {}),
          }}
          disabled={status === 'submitting'}
        />
        {errors.topic && <p style={s.errorText}>{errors.topic}</p>}
      </div>

      {/* Degree + Discipline */}
      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Degree level</label>
          <select
            value={degree}
            onChange={e => { setDegree(e.target.value); setErrors(prev => ({ ...prev, degree: '' })) }}
            style={{
              ...s.select,
              ...(errors.degree ? s.inputError : {}),
            }}
            disabled={status === 'submitting'}
          >
            <option value="">Select...</option>
            {DEGREE_LEVELS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          {errors.degree && <p style={s.errorText}>{errors.degree}</p>}
        </div>
        <div style={s.field}>
          <label style={s.label}>Discipline</label>
          <select
            value={discipline}
            onChange={e => { setDiscipline(e.target.value); setErrors(prev => ({ ...prev, discipline: '' })) }}
            style={{
              ...s.select,
              ...(errors.discipline ? s.inputError : {}),
            }}
            disabled={status === 'submitting'}
          >
            <option value="">Select...</option>
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.discipline && <p style={s.errorText}>{errors.discipline}</p>}
        </div>
      </div>

      {/* Optional: reading list */}
      <div>
        <button type="button" onClick={() => setShowReading(v => !v)} style={s.disclosure}>
          {showReading ? '▾' : '▸'} Have a reading list already? <span style={s.optional}>(optional)</span>
        </button>
        {showReading && (
          <textarea
            value={readingList}
            onChange={e => setReadingList(e.target.value)}
            placeholder="Paste your reading list here — one entry per line or as a block of text."
            rows={5}
            style={{ ...s.textarea, marginTop: '0.5rem' }}
            disabled={status === 'submitting'}
          />
        )}
      </div>

      {/* Optional: file upload */}
      <div>
        <button type="button" onClick={() => setShowUpload(v => !v)} style={s.disclosure}>
          {showUpload ? '▾' : '▸'} Upload your assignment brief / TOR <span style={s.optional}>(optional)</span>
        </button>
        {showUpload && (
          <div
            style={s.dropzone}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) setFile(f)
            }}
          >
            {file
              ? <span style={{ color: 'var(--ink-blue)', fontWeight: 500 }}>📄 {file.name}</span>
              : <span style={{ color: 'var(--pencil)' }}>Drag a PDF or Word file here, or <u>click to browse</u></span>
            }
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </div>
        )}
      </div>

      {status === 'error' && (
        <p style={s.errorText}>Something went wrong — please try again.</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'submitting'}
        style={{
          ...s.btn,
          ...(status === 'submitting' ? s.btnLoading : !isValid ? s.btnDisabled : {}),
        }}
      >
        {status === 'submitting' ? (
          <><Spinner /> Reading your brief...</>
        ) : (
          'Start my research →'
        )}
      </button>
    </form>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '14px', height: '14px',
      border: '2px solid var(--marker-lime)',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      marginRight: '0.5rem',
      verticalAlign: 'middle',
    }} />
  )
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    color: 'var(--ink)',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.6,
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    color: 'var(--ink)',
    outline: 'none',
    cursor: 'pointer',
  },
  inputError: {
    background: 'var(--error-bg)',
    borderColor: 'var(--error)',
  },
  inputFilled: {
    borderColor: 'var(--stone)',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--graphite)',
  },
  disclosure: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    color: 'var(--ink-blue)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  optional: {
    color: 'var(--pencil)',
    fontWeight: 400,
  },
  dropzone: {
    marginTop: '0.5rem',
    border: '1px dashed var(--stone)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    cursor: 'pointer',
    background: 'var(--sheet)',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.25rem',
    background: 'var(--ink-blue)',
    color: 'var(--sheet)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  btnDisabled: {
    background: 'var(--paper-deep)',
    color: 'var(--pencil)',
    cursor: 'default',
  },
  btnLoading: {
    background: 'var(--ink-blue)',
    cursor: 'wait',
  },
  errorText: {
    fontSize: '0.8125rem',
    color: 'var(--error)',
    marginTop: '0.375rem',
    lineHeight: 1.4,
  },
}
```

Add the spinner animation to `app/globals.css` (append after the existing rules):

```css
@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive: stack selects on narrow viewport */
@media (max-width: 600px) {
  .brief-row { grid-template-columns: 1fr !important; }
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
git add app/project/ app/globals.css
git commit -m "feat: add BriefForm client component (Screen 1 UI)"
```

---

## Task 5 — Screen 1: server action + page

**Files:**
- Create: `app/project/[id]/brief/actions.ts`
- Create: `app/project/[id]/brief/page.tsx`

**Interfaces:**
- Consumes: `extractBrief()` from `lib/prompts/brief.ts`, `generateSocraticQuestions()` from `lib/prompts/brief.ts`, `updateResearchContext()` from `lib/research-context.ts`
- Produces: `submitBrief(formData)` server action — saves brief + questions, redirects to `/project/[id]/gate1`

- [ ] **Step 1: Create app/project/[id]/brief/actions.ts**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { extractBrief, generateSocraticQuestions } from '@/lib/prompts/brief'

export async function submitBrief(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId  = formData.get('projectId') as string
  const topic      = formData.get('topic') as string
  const degreeLevel = formData.get('degreeLevel') as string
  const discipline = formData.get('discipline') as string
  const readingList = formData.get('readingList') as string | null

  // Parse uploaded file if present
  let fileText: string | undefined
  const file = formData.get('file') as File | null
  if (file && file.size > 0) {
    fileText = await parseUploadedFile(file)
  }

  // Verify project belongs to user
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  // 1. Extract structured brief via Claude
  const briefExtraction = await extractBrief(
    topic, degreeLevel, discipline,
    readingList ?? undefined,
    fileText
  )

  // 2. Generate 4 Socratic questions via Claude
  const questions = await generateSocraticQuestions(briefExtraction)

  // 3. Save to research_context
  await updateResearchContext(
    projectId,
    'brief',
    {
      brief: briefExtraction,
      // Store questions here so gate1 page can read them without re-generating
      socratic_gate_1: {
        completed: false,
        responses: {},
        // @ts-ignore — extending the type with questions array for gate1 consumption
        questions,
      },
    },
    supabase
  )

  redirect(`/project/${projectId}/gate1`)
}

async function parseUploadedFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()

  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value.slice(0, 8000) // cap at 8k chars
  }

  if (name.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text.slice(0, 8000)
  }

  return ''
}
```

- [ ] **Step 2: Create app/project/[id]/brief/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BriefForm from './BriefForm'
import type { Project } from '@/types/database'

export const metadata = { title: 'Tell me what you\'re researching — Methea' }

export default async function BriefPage({ params }: { params: { id: string } }) {
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

  // If brief already submitted and gate1 not yet complete, go to gate1
  if (p.research_context?.brief && !p.research_context?.socratic_gate_1?.completed) {
    redirect(`/project/${params.id}/gate1`)
  }

  // If everything is done, go to project dashboard
  if (p.research_context?.socratic_gate_1?.completed) {
    redirect(`/project/${params.id}`)
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <span style={styles.wordmark}>Methea</span>
        <h2 style={styles.heading}>Tell me what you&apos;re researching</h2>
        <p style={styles.sub}>A sentence or two is enough to start.</p>
        <BriefForm projectId={params.id} />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' },
  container: { width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' },
  wordmark: { fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--ink)' },
  heading: { fontSize: '1.75rem', color: 'var(--ink)', marginTop: '0.25rem' },
  sub: { fontSize: '0.9375rem', color: 'var(--pencil)' },
}
```

- [ ] **Step 3: Update app/project/[id]/page.tsx to redirect to /brief if no brief yet**

In `app/project/[id]/page.tsx`, add after the `notFound()` check (after fetching the project):

```tsx
// Redirect to the active step
if (!p.research_context?.brief) {
  redirect(`/project/${params.id}/brief`)
}
if (p.research_context?.brief && !p.research_context?.socratic_gate_1?.completed) {
  redirect(`/project/${params.id}/gate1`)
}
```

- [ ] **Step 4: Verify build**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/next/dist/bin/next build 2>&1 | tail -20
```

Expected: clean build, `/project/[id]/brief` appears in the route list.

- [ ] **Step 5: Manual test — Screen 1 renders**

Start dev server: `node node_modules/next/dist/bin/next dev`
- Visit `http://localhost:3000` → should redirect to login → sign in → onboarding → creates project → redirects to `/project/[id]/brief`
- Screen 1 form appears with topic textarea, two selects, two optional disclosures, disabled button
- Type 10+ chars in topic + select both dropdowns → button activates
- Click "Start my research →" → button shows spinner and "Reading your brief..." → after ~5-10s Claude responds → redirects to `/project/[id]/gate1` (404 for now, that's fine)

- [ ] **Step 6: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add app/project/
git commit -m "feat: Screen 1 brief upload — server action, page, project routing"
```

---

## Task 6 — Screen 2: Gate1Form client component

**Files:**
- Create: `app/project/[id]/gate1/Gate1Form.tsx`

**Interfaces:**
- Consumes: `RadioCard` from `components/ui/RadioCard.tsx`, `ClarificationQuestion` type
- Produces: `<Gate1Form projectId questions brief />` — 4-step radio-card flow, calls `submitGate1` on finish

- [ ] **Step 1: Create app/project/[id]/gate1/Gate1Form.tsx**

```tsx
'use client'

import { useState } from 'react'
import RadioCard from '@/components/ui/RadioCard'
import { submitGate1 } from './actions'
import type { ClarificationQuestion, BriefExtraction } from '@/types/database'

interface Props {
  projectId: string
  questions: ClarificationQuestion[]
  brief: BriefExtraction
}

export default function Gate1Form({ projectId, questions, brief }: Props) {
  const [step, setStep]       = useState(0) // 0-indexed
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const current = questions[step]
  const selected = answers[current.id]
  const isLast = step === questions.length - 1

  function selectOption(value: string) {
    setAnswers(prev => ({ ...prev, [current.id]: value }))
  }

  function goBack() {
    if (step === 0) return // handled by Back link to Screen 1
    setStep(s => s - 1)
  }

  async function goForward() {
    if (!selected) return
    if (!isLast) {
      setStep(s => s + 1)
      return
    }
    // Final step — submit
    setSubmitting(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('answers', JSON.stringify(answers))
    await submitGate1(formData)
  }

  return (
    <div style={s.container}>
      {/* AI confirmation banner */}
      <div style={s.banner}>
        <p style={s.bannerText}>
          Based on your brief, your question seems to be about <strong>{brief.topic}</strong>.
          Let&apos;s sharpen it together.
        </p>
      </div>

      {/* Progress indicator */}
      <div style={s.progress}>
        {questions.map((q, i) => (
          <div key={q.id} style={s.progressItem}>
            <div style={{
              ...s.dot,
              background: i <= step ? 'var(--ink-blue)' : 'transparent',
              borderColor: i <= step ? 'var(--ink-blue)' : 'var(--stone)',
            }} />
            {i < questions.length - 1 && (
              <div style={{
                ...s.line,
                background: i < step ? 'var(--marker-lime)' : 'var(--stone-soft)',
              }} />
            )}
          </div>
        ))}
        <span style={s.progressLabel}>Question {step + 1} of {questions.length}</span>
      </div>

      {/* Question */}
      <h3 style={s.question}>{current.prompt}</h3>

      {/* Radio cards */}
      <div style={s.options}>
        {current.options.map(opt => (
          <RadioCard
            key={opt.value}
            option={opt}
            selected={selected === opt.value}
            onSelect={() => selectOption(opt.value)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div style={s.nav}>
        {step === 0 ? (
          <a href={`/project/${projectId}/brief`} style={s.backLink}>← Back</a>
        ) : (
          <button type="button" onClick={goBack} style={s.backBtn}>← Back</button>
        )}
        <button
          type="button"
          onClick={goForward}
          disabled={!selected || submitting}
          style={{
            ...s.continueBtn,
            ...(!selected || submitting ? s.continueBtnDisabled : {}),
          }}
        >
          {submitting ? 'Saving...' : isLast ? 'Finish →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  banner: {
    padding: '1rem 1.25rem',
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
  },
  bannerText: { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.6 },
  progress: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
  },
  progressItem: { display: 'flex', alignItems: 'center' },
  dot: {
    width: '12px', height: '12px',
    borderRadius: '50%',
    border: '2px solid var(--stone)',
    flexShrink: 0,
  },
  line: {
    width: '32px', height: '2px',
    background: 'var(--stone-soft)',
  },
  progressLabel: {
    marginLeft: '0.75rem',
    fontSize: '0.8125rem',
    color: 'var(--pencil)',
  },
  question: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--ink)',
    lineHeight: 1.4,
  },
  options: { display: 'flex', flexDirection: 'column', gap: '0.625rem' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' },
  backLink: { fontSize: '0.9375rem', color: 'var(--ink-blue)', textDecoration: 'none' },
  backBtn: {
    background: 'none', border: 'none', padding: 0,
    fontSize: '0.9375rem', fontFamily: 'inherit',
    color: 'var(--ink-blue)', cursor: 'pointer',
  },
  continueBtn: {
    padding: '0.625rem 1.25rem',
    background: 'var(--ink-blue)',
    color: 'var(--sheet)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
  },
  continueBtnDisabled: {
    background: 'var(--paper-deep)',
    color: 'var(--pencil)',
    cursor: 'default',
  },
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
git add app/project/
git commit -m "feat: add Gate1Form client component (Screen 2 UI)"
```

---

## Task 7 — Screen 2: server action + page

**Files:**
- Create: `app/project/[id]/gate1/actions.ts`
- Create: `app/project/[id]/gate1/page.tsx`

**Interfaces:**
- Consumes: `updateResearchContext()`, `ClarificationQuestion` stored in `research_context.socratic_gate_1.questions`
- Produces: `submitGate1(formData)` → saves completed gate1 responses → redirects to `/project/[id]`

- [ ] **Step 1: Create app/project/[id]/gate1/actions.ts**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'

export async function submitGate1(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const answers = JSON.parse(formData.get('answers') as string) as Record<string, string>

  const { data: project } = await supabase
    .from('projects')
    .select('research_context, context_version')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  // Preserve the questions array that was generated during submitBrief
  const existingGate1 = project.research_context?.socratic_gate_1 ?? {}

  await updateResearchContext(
    projectId,
    'socratic_gate_1',
    {
      socratic_gate_1: {
        ...existingGate1,
        completed: true,
        responses: answers,
      },
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}
```

- [ ] **Step 2: Create app/project/[id]/gate1/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Gate1Form from './Gate1Form'
import type { Project, ClarificationQuestion, BriefExtraction } from '@/types/database'

export const metadata = { title: 'Sharpening your research question — Methea' }

export default async function Gate1Page({ params }: { params: { id: string } }) {
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

  // Guard: must have a brief before gate1
  if (!ctx?.brief) redirect(`/project/${params.id}/brief`)

  // If gate1 already completed, go to dashboard
  if (ctx?.socratic_gate_1?.completed) redirect(`/project/${params.id}`)

  // Questions were stored by submitBrief — read them back
  // @ts-ignore — questions stored alongside socratic_gate_1
  const questions: ClarificationQuestion[] = ctx?.socratic_gate_1?.questions ?? []

  if (questions.length === 0) {
    // Edge case: questions weren't generated — send back to brief
    redirect(`/project/${params.id}/brief`)
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <span style={styles.wordmark}>Methea</span>
        <Gate1Form
          projectId={params.id}
          questions={questions}
          brief={ctx.brief as BriefExtraction}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' },
  container: { width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  wordmark: { fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--ink)' },
}
```

- [ ] **Step 3: Verify full build**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/next/dist/bin/next build 2>&1 | tail -20
```

Expected: clean build. `/project/[id]/gate1` appears in route list.

- [ ] **Step 4: Commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add app/project/
git commit -m "feat: Screen 2 gate1 — server action, page, submit to research_context"
```

---

## Task 8 — End-to-end integration test + edge cases

**Files:**
- No new files — verification only

**Goal:** Run the full Sprint 1 flow 3 times with different briefs and confirm the definition of done is met.

- [ ] **Step 1: Start dev server**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
node node_modules/next/dist/bin/next dev
```

- [ ] **Step 2: Test brief 1 — qualitative/exploratory**

Visit `http://localhost:3000`. Sign in. On onboarding, title: "Founder decision-making study".

Screen 1:
- Topic: "How do solo founders in Central Asia decide when to raise outside funding?"
- Degree: Master's, Discipline: Business & Management
- Submit → wait for Claude → should reach gate1

Gate1: answer all 4 questions → click Finish → should reach `/project/[id]`

Verify in Supabase dashboard (Table Editor → projects):
- `research_context.brief.research_question` is a well-formed question
- `research_context.brief.research_type` is `"exploratory"`
- `research_context.socratic_gate_1.completed` is `true`
- `research_context.socratic_gate_1.responses` has 4 entries (q1-q4)
- `context_version` is `3` (1 initial + 1 brief + 1 gate1)
- `research_context_versions` table has 2 new rows

- [ ] **Step 3: Test brief 2 — quantitative/descriptive**

Create a new project from onboarding.

Screen 1:
- Topic: "How widespread is burnout among NHS nurses in post-pandemic wards?"
- Degree: PhD, Discipline: Health Sciences
- Submit → gate1

Verify: `research_context.brief.research_type` is `"descriptive"` or `"exploratory"`. Gate1 questions should be substantively different from Test 1 (because Claude generates them from the specific brief, not a template).

- [ ] **Step 4: Test edge case — short topic rejected**

Screen 1: type only "burnout" (< 10 chars) → click submit → should stay on Screen 1 with inline error guidance text, no redirect, no spinner.

- [ ] **Step 5: Test edge case — Back button in gate1**

On gate1 at step 3: click ← Back → should go to step 2 with previously selected option still highlighted. Click ← Back again → step 1, selection preserved. Click ← Back at step 1 → should return to `/brief` with form still renderable.

- [ ] **Step 6: Test edge case — revisit completed project**

After finishing gate1, visit `/project/[id]/brief` directly → should redirect to `/project/[id]` (brief already done). Visit `/project/[id]/gate1` directly → should redirect to `/project/[id]` (gate1 already done).

- [ ] **Step 7: Final commit**

```bash
cd "/Users/bermetkoshoeva/CLAUDE Methea/methea-app"
git add -A
git commit -m "sprint 1 complete: brief upload, AI extraction, Socratic gate 1 end-to-end"
```

---

## Sprint 1 Definition of Done (from roadmap)

- [ ] Student types or pastes a brief → 4-question gate runs → structured brief is saved to `research_context`
- [ ] AI correctly classifies intent (exploratory/explanatory/descriptive) in 8/10 test cases — verify manually with 3 briefs above
- [ ] Back button works non-destructively across both screens
- [ ] Short/empty brief is rejected inline with guidance-tone copy (not a toast, not a modal)
- [ ] Route guards prevent skipping steps (gate1 without brief → redirect to brief)

---

*Sprint 1 plan — June 2026 · methea-app*
