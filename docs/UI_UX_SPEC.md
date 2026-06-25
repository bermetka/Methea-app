# Methea — UI/UX Build Spec

> Standalone frontend track. Run this in a separate chat session focused purely on UI/UX, in parallel with backend/logic sprints. This document gives a fresh Claude Code session everything it needs to build screens without re-deriving the brand system or UX decisions from scratch.

**Scope of this version:** Plan layer only — brief upload, Socratic gate 1, framework builder (incl. theory discovery), methodology chain, dashboard. Collect/Analyse layers are out of scope until MVP validates (see `SPRINT_ROADMAP_RECALIBRATED.md`).

**Priority:** Sections 1-2 are complete and unblock Sprint 1 Day 1 (Screen 1) and Day 3 (Screen 2). Sections 3-5 (Screens 3-5) are sketched at concept level for Sprints 2-5 — enough to plan against, not final pixel specs. Revisit each before its sprint starts.

## How to use this document

Paste the relevant section into a new chat along with: "Build this screen as a React component using the Methea brand system below. This is frontend-only — assume the data shape described, no need to wire up real API calls yet, use mock data matching the shape."

This keeps frontend work decoupled from backend sprint pacing — UI can run ahead of or behind the logic work without blocking either.

---

## 1. Brand tokens — single source of truth, every screen below references this

### 1.1 Typography

```
Logo + display headings:  Playfair Display, weight 400
                           Tracking: -4.5% on wordmark, -2.5% on
                           display (40-64px), -1.5% on H2 (22-32px)
                           Never below 18px.
UI (buttons, nav, labels): Schibsted Grotesk, weight 400-600
Long-form reading:         Source Serif 4, 16-17px, line-height 1.8
Hand-drawn accents:        Caveat, weight 500-600 (sticky notes,
                           doodle annotations only — never body UI)
```

| Token | Font | Size | Weight | Line-height | Use |
|---|---|---|---|---|---|
| H1 | Playfair Display | 40-64px | 400 | 1.1 | Page-level display title (rare — landing/dashboard greeting only) |
| H2 | Playfair Display | 22-32px | 400 | 1.2 | Section headings ("Based on your brief...") |
| H3 | Schibsted Grotesk | 18-20px | 600 | 1.3 | Card titles, question prompts |
| Body | Schibsted Grotesk | 15-16px | 400 | 1.5 | UI copy, labels, buttons |
| Body-serif | Source Serif 4 | 16-17px | 400 | 1.8 | Narrative paragraphs, long-form generated text (framework narrative, methodology paragraph) |
| Caption | Schibsted Grotesk | 12-13px | 400-500 | 1.4 | Helper text, chip labels, timestamps |

### 1.2 Color tokens

```
--paper:        #F6F2E8   (main background)
--sheet:        #FBF9F3   (cards, modals — lighter than paper)
--paper-deep:   #EDE7D8   (hover states, code blocks)
--stone:        #DDD8C6   (borders, strong)
--stone-soft:   #E9E4D6   (borders, subtle)
--ink:          #1C1C1C   (headings, logo, primary text)
--graphite:     #4A4A47   (body text, secondary)
--pencil:       #8C8A82   (captions, placeholders, tertiary)
--ink-blue:     #11425D   (links, primary buttons)
--ink-blue-deep:#002233   (button hover state)
--marker-yellow:#FFE66D   (key insight highlight, ⚠ outdated state)
--marker-lime:  #DDFF55   (logo stroke, CTA hover glow, progress bars)
--marker-green: #B7F171   (✓ verified state, success)
--sky:          #C0D6EA   (info chips, calm notices)
--verified-text:#2E7D4F   (text color on green verified chips)
--warn-text:    #6B5500   (text color on yellow outdated chips)
--error:        #B3413B   (validation error text/icon — new, see 1.4)
--error-bg:     #F4E3E0   (validation error field background — new, see 1.4)
```

**Color proportion rule:** ~70% paper, ~25% ink, ~5% marker. If a screen "feels yellow," marker has taken over — pull it back to single accent uses, not area fills.

### 1.3 Spacing, radius, shadow, viewport

```
SPACING:  8px base unit. Scale: 4 (tight/inline) · 8 · 16 · 24 · 32 · 48 · 64
RADIUS:   6px small (chips, tags) · 10px medium (default — buttons,
          inputs, cards) · 14px large (page-level cards, modals)
SHADOW:   nearly absent — paper sits flat, no heavy elevation.
          Only exception: a 1px var(--stone-soft) border doubles as
          the "lift" cue. If a shadow is unavoidable (e.g. modal over
          content), use 0 4px 16px rgba(28,28,28,0.06) — never higher.
BORDERS:  1px solid var(--stone-soft) default, var(--stone) for
          emphasis (active/focused state)
VIEWPORT: single column, max-width 720px, 13" laptop first. No
          sidebars in MVP. Mobile = read-only status viewing
          (see Screen 5, §6.4).
```

### 1.4 UI primitives

**Buttons**

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary | `--ink-blue` | `--sheet` (white-ish) | none | Main CTA, one per screen ("Continue", "Build framework") |
| Primary:hover | `--ink-blue-deep` | `--sheet` | none | — |
| Secondary / ghost | transparent | `--ink-blue` | 1px `--stone` | "Suggest alternative", "Browse full library" |
| Disabled | `--paper-deep` | `--pencil` | 1px `--stone-soft` | Until required fields are valid |

All buttons: 10px radius, 12px vertical / 20px horizontal padding, Schibsted Grotesk 600, no uppercase transform (brand never shouts).

**Inputs (text/textarea/select)**

```
Default:    bg var(--sheet), border 1px var(--stone-soft), radius 10px,
            padding 12px 16px, placeholder color var(--pencil)
Focus:      border 1px var(--ink-blue), no glow/ring (keep it flat)
Filled:     border 1px var(--stone) (slightly stronger than default,
            signals "has content" without color-coding)
Error:      bg var(--error-bg), border 1px var(--error), helper text
            below in var(--error) — see error-copy rule in §1.5
Disabled:   bg var(--paper-deep), text var(--pencil)
```

**Cards**

```
bg var(--sheet), border 1px var(--stone-soft), radius 10px
(14px if page-level), padding 24px, no shadow by default.
Selected state: border 1px var(--ink-blue) + 2px inset feel via
padding adjustment (don't add a shadow to signal selection —
use border weight + a small ✓ in the corner instead).
```

**Verified-state chip** — used everywhere, build once:

```
✓ green chip   = "Verified · DOI found"        bg: marker-green, text: verified-text
✓ green chip   = "Verified · Classic text"     bg: marker-green, text: verified-text
? gray chip    = "Unverified — check manually"  bg: stone-soft, text: pencil
⚠ amber chip   = "Outdated — framework changed" bg: marker-yellow, text: warn-text
+ sky chip     = "In your reading list"         bg: sky, text: ink-blue
```

**Verification logic — not all verified sources have a DOI.** DOIs only exist for works published after the DOI system rolled out (roughly mid-1990s onward). A meaningful chunk of the theory library — Bourdieu 1986, Freeman 1984, Glaser & Strauss 1967, Bhaskar 1975, and others — are pre-DOI classics with no DOI to check, by nature of when they were published, not because verification failed.

```ts
type VerificationStatus =
  | { kind: 'doi_verified', doi: string }
  | { kind: 'classic_verified', source: string } // e.g. "Confirmed via Cambridge University Press"
  | { kind: 'unverified' }

function getChipLabel(status: VerificationStatus): string {
  switch (status.kind) {
    case 'doi_verified':     return 'Verified · DOI found'
    case 'classic_verified': return 'Verified · Classic text'
    case 'unverified':       return 'Unverified — check manually'
  }
}
```

Both `doi_verified` and `classic_verified` render the same green chip — the distinction is in the label text and tooltip detail, not the visual treatment. Build `<StatusChip status={...}>` to take this `VerificationStatus` shape directly, not a boolean — collapsing pre-DOI classics into "unverified" would incorrectly flag ~24 of the 40 library theories as untrustworthy when they were independently confirmed via publisher records during content sourcing. A hover/tap on the chip reveals the underlying `verified_source_check` text — this is what actually builds supervisor trust when a student wants to double-check.

This component appears in: theory cards, framework narrative (inline citations), interview guide tags, dashboard status cards. One implementation, never four ad-hoc versions.

### 1.5 Tone reference for any copy/microcopy in components

```
DO:    "Based on your brief, your question seems to be about X —
        does this capture it?"
DON'T: "Enter your research question."

DO:    "Pick 2-4 theories to build on — or browse the full
        library if none of these feel right."
DON'T: "Theory selection required."

DO:    "Here's the methodology your framework points to —
        and why each choice follows."
DON'T: "AI has generated your methodology."
```

Co-constructive, never interrogative. Always acknowledge what the student brought before asking for more. **Error-copy rule:** never use error-message tone for empty/invalid states — reframe as guidance, even in the red error-state field. E.g. not "Topic is required" but "What are you researching? A sentence or two is enough to get started."

---

## 2. Screen 1 — Brief upload / topic entry

**Priority: Sprint 1, Day 1. Build this first.**

### 2.1 State shape

```ts
{
  topic: string,
  degreeLevel: 'bachelor' | 'masters' | 'phd' | 'independent',
  discipline: string,
  readingList?: string,   // optional pasted text
  uploadedFile?: File,    // optional PDF/docx — TOR/brief
  status: 'empty' | 'filled' | 'validating' | 'error' | 'submitting'
}
```

### 2.2 Wireframe — desktop (single centered card, max-width 600px, on `--paper` background)

```
┌──────────────────────────────────────────────────────┐
│                                                        │
│                      Methea  ︵︶                       │   ← logo, Playfair, lime stroke
│                                                        │
│        Tell me what you're researching                │   ← H2, Playfair
│        A sentence or two is enough to start.           │   ← caption, pencil color
│                                                        │
│   ┌────────────────────────────────────────────────┐  │
│   │                                                  │  │
│   │  e.g. "How do solo founders in Central Asia      │  │  ← textarea, --sheet bg
│   │  decide when to raise outside funding?"          │  │     placeholder in --pencil
│   │                                                  │  │
│   └────────────────────────────────────────────────┘  │
│                                                        │
│   Degree level              Discipline                │   ← caption labels
│   ┌──────────────────┐     ┌──────────────────┐      │
│   │ Masters        ▾  │     │ Select...      ▾  │      │   ← two selects, side by side
│   └──────────────────┘     └──────────────────┘      │
│                                                        │
│   ▸ Have a reading list already? (optional)            │   ← collapsed disclosure, ghost
│                                                        │
│   ▸ Upload your assignment brief/TOR (optional)         │   ← collapsed disclosure, ghost
│                                                        │
│                                                        │
│              ┌──────────────────────────┐             │
│              │   Start my research   →   │             │   ← primary button, ink-blue
│              └──────────────────────────┘             │
│                                                        │
└──────────────────────────────────────────────────────┘
```

The two optional disclosures (`reading list`, `file upload`) are collapsed by default — keeps the first screen feeling like "just one question," not a form. Expanding either reveals: reading-list → a plain textarea; file upload → a dropzone (`drag a PDF or Word file here, or click to browse`).

### 2.3 Wireframe — mobile (≤480px, single column, full-bleed card)

```
┌─────────────────────────┐
│      Methea  ︵︶          │
│                           │
│ Tell me what you're      │
│ researching               │
│                           │
│ ┌───────────────────────┐ │
│ │ e.g. "How do solo...   │ │
│ └───────────────────────┘ │
│                           │
│ Degree level              │
│ ┌───────────────────────┐ │
│ │ Masters            ▾  │ │
│ └───────────────────────┘ │
│                           │
│ Discipline                │
│ ┌───────────────────────┐ │
│ │ Select...           ▾ │ │
│ └───────────────────────┘ │
│                           │
│ ▸ Reading list (optional) │
│ ▸ Upload brief (optional) │
│                           │
│ ┌───────────────────────┐ │
│ │  Start my research →  │ │
│ └───────────────────────┘ │
└─────────────────────────┘
```

Selects stack vertically instead of side-by-side below ~600px. Everything else is identical — this screen is simple enough that "mobile = read-only" doesn't apply here; a student can plausibly start a brief from their phone even if the rest of the product is desktop-first.

### 2.4 States

| State | Trigger | Visual treatment |
|---|---|---|
| **Empty** | Page load, nothing typed | Textarea shows placeholder example, button is `disabled` style, selects show "Select..." |
| **Filled** | Topic has ≥1 sentence AND both selects chosen | Button becomes active `primary` style. No other visual change — don't reward filling with confetti/checkmarks, keep it calm |
| **Validation error** | Submit attempted with topic empty or too short (<10 chars) | Textarea border/bg switch to `--error` / `--error-bg`; helper text appears below in `--error`: *"A sentence or two helps me understand what you're after — try adding a bit more."* Selects get a 1px `--error` border if unselected. No toast/modal — inline only |
| **Loading (post-submit)** | Button clicked, valid state | Button text changes to "Reading your brief..." with a small inline spinner (no full-page overlay — the card stays visible, just the button area changes), all inputs become `disabled` style so nothing can be edited mid-submit |

```
Loading button state:
┌──────────────────────────┐
│  ◌ Reading your brief...  │   ← spinner is a thin rotating ring,
└──────────────────────────┘      lime accent, not ink-blue (keeps
                                   it feeling light, not heavy)
```

On success, transition directly into Screen 2 (no intermediate confirmation screen) — the AI-confirmation banner at the top of Screen 2 *is* the confirmation.

---

## 3. Screen 2 — Socratic gate 1 (clarification)

**Priority: Sprint 1, Day 3.**

### 3.1 State shape

```ts
{
  researchBrief: { question: string, type: string, constraints: string[] },
  clarificationStep: number,        // 1-4
  questions: ClarificationQuestion[], // generated from brief, fixed once generated
  answers: Record<string, string>,    // keyed by questionId, accumulates as student progresses
  canGoBack: boolean
}

type ClarificationQuestion = {
  id: string,
  prompt: string,                  // e.g. "Is this more about understanding why, or measuring how much?"
  options: { value: string, title: string, description: string }[] // 3 options
}
```

### 3.2 Wireframe — desktop

```
┌──────────────────────────────────────────────────────┐
│                                                        │
│  Based on your brief, your question seems to be        │   ← H2, AI-confirmation banner
│  about how solo founders decide on funding timing.      │      bg --sheet, sits inside card,
│  Let's sharpen it together.                             │      not a separate alert color
│                                                        │
│  ●━━━●━━━○━━━○   Question 2 of 4                       │   ← progress: filled dots = done,
│                                                        │      lime fill on the connecting line
│                                                        │
│  Is this more about understanding *why* founders        │   ← H3, the question itself
│  decide, or about *measuring how often* they do?         │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ ○  Understanding why                             │  │   ← radio-card, unselected:
│  │    Explores motivations, reasoning, decision      │  │      border stone-soft
│  │    process behind the choice                      │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │ ●  Measuring how often                           │  │   ← radio-card, selected:
│  │    Looks at patterns, frequency, or correlation   │  │      border ink-blue, ✓ in corner
│  │    across many founders                           │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │ ○  Both, roughly equally                         │  │
│  │    A mixed approach looking at patterns and       │  │
│  │    the reasoning behind them                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ← Back                              Continue →        │   ← ghost back, primary continue
│                                                        │
└──────────────────────────────────────────────────────┘
```

Each of the 4 questions reuses this exact radio-card component — only `prompt` and `options` change. Selecting an option immediately highlights it (no separate "confirm" step); `Continue` advances.

### 3.3 Progress indicator

```
Step 1: ●━━━○━━━○━━━○   (1 of 4)
Step 2: ●━━━●━━━○━━━○   (2 of 4)
Step 3: ●━━━●━━━●━━━○   (3 of 4)
Step 4: ●━━━●━━━●━━━●   (4 of 4, "Continue" becomes "Finish")
```

Filled segment = `--marker-lime` fill on the connector line, dot = `--ink-blue`. Unreached dots = `--stone-soft` outline only. Label next to it: `"Question X of 4"` in caption style — never just a bare bar with no text, screen readers and anxious-at-2am students both need the number.

### 3.4 State accumulation logic (UI-level, not DB schema)

The screen holds one `answers` map that grows as the student progresses:

```
Step 1 answered →  answers = { q1: 'measuring_how_often' }
Step 2 answered →  answers = { q1: ..., q2: 'mixed_methods' }
Step 3 answered →  answers = { q1: ..., q2: ..., q3: 'cross_sectional' }
Step 4 answered →  answers = { q1: ..., q2: ..., q3: ..., q4: 'students' }
```

On "Finish" (after Q4), the full `answers` map is sent to the backend in one call, which merges it into `research_context.researchBrief` along with the original `topic`/`degreeLevel`/`discipline` from Screen 1. The UI never constructs the final `research_context` object itself — it only accumulates raw answers and hands them off. This keeps the frontend dumb about schema (per CLAUDE.md: `research_context` is the single versioned source of truth, owned by the backend).

### 3.5 Back / edit state

```
← Back
```

Clicking Back at step N:
- Decrements `clarificationStep` to N-1
- Re-renders question N-1 with its previously selected option already highlighted (read from `answers[questionId]`, not reset to empty)
- Does **not** clear answers for steps the student hasn't reached — going back and forward should feel reversible, not punishing
- At step 1, "Back" instead returns to Screen 1 with the original topic/degree/discipline still filled in (state isn't lost crossing the screen boundary either)

If a student changes an earlier answer and that answer would have changed a *later* question's options (e.g. Q1's answer determines Q2's wording), regenerating Q2-Q4 is out of scope for MVP — the 4 questions are generated once from the original brief and stay fixed regardless of how earlier answers change. Flag this as a known v1.1 limitation, not a bug to fix now.

---

## 4. Screen 3 — Framework builder (incl. theory discovery)

**Priority: Sprints 2-3. Concept-level for now — refine before Sprint 2 starts.**

This screen has two stages students move through in sequence: **3a Theory discovery** (select 2-4 theories) → **3b Framework diagram + narrative** (generated from the selection). Same screen route, two visual states.

### 4.1 State shape

```ts
{
  stage: 'discovery' | 'diagram',
  suggested: Theory[],              // 5 items from AI
  selected: string[],               // theory IDs chosen, 2-4 expected
  readingListMatches: Record<string, 'in_list' | 'beyond_list' | 'missed'>,
  showFullLibrary: boolean,
  layoutPreset: 'hierarchy' | 'hub-spoke' | 'linear',
  diagramSvg: string,                // generated server-side, frontend just renders it
  narrative: string,                 // generated paragraph with citation markers
  citationVerification: Record<string, VerificationStatus>
}
```

### 4.2 Stage 3a — Theory discovery wireframe

```
┌──────────────────────────────────────────────────────┐
│  Based on your question, these theories tend to        │
│  fit well. Pick 2-4 to build on.                        │
│                                                        │
│  ┌─────────────────┐ ┌─────────────────┐              │
│  │ Resource          │ │ Social             │              │
│  │ Dependence Theory  │ │ Constructionism    │              │
│  │ Pfeffer & Salancik │ │ Berger & Luckmann   │              │
│  │ 1978                │ │ 1966                 │              │
│  │                    │ │                     │              │
│  │ "Why it fits": ...  │ │ "Why it fits": ...   │              │
│  │ [tag] [tag] [tag]   │ │ [tag] [tag]          │              │
│  │                    │ │                     │              │
│  │ ✓ Verified · DOI    │ │ ✓ Verified · Classic │              │
│  │ + In your list      │ │                     │              │
│  │           ☑ Selected│ │           ☐ Select   │              │
│  └─────────────────┘ └─────────────────┘              │
│        ... 3 more cards in a responsive grid ...        │
│                                                        │
│  ▸ Browse full library (40 theories, filter by          │
│    discipline/type)                                     │
│                                                        │
│              ┌──────────────────────────┐             │
│              │  Build my framework →     │             │
│              └──────────────────────────┘             │
└──────────────────────────────────────────────────────┘
```

Each card: name/author/year (Schibsted, bold), `plain_summary` as italic "why it fits" line (Source Serif, smaller), `key_concepts` as tag pills (stone-soft bg), the reading-list-match chip (sky, only if applicable) and verification chip (green/gray, see §1.4) stacked, selection checkbox bottom-right. Selected card gets the `--ink-blue` border treatment from §1.4.

**Dual-role theory handling (e.g. "Grounded theory"):** when a theory is both a theoretical lens *and* commonly listed as another theory's methodology, add a small inline label under the name: *"Theoretical lens — also commonly used as a method."* This card is the one place it's selected as a *framework component*; later, in Screen 4, the same name may appear again purely as a methodology reference — render that occurrence as plain text inside a reasoning sentence, never as a second selectable card, so it doesn't read as "select this framework again."

"Build my framework" is disabled until 2-4 theories are selected (not 1, not 5+ — show a small caption if out of range: *"Pick at least 2 to see how they relate"* / *"4 is plenty to start — try narrowing it down"*).

### 4.3 Stage 3b — Diagram + narrative wireframe

```
┌──────────────────────────────────────────────────────┐
│  Layout:  [ ⬡ Hierarchy ]  [ ⬢ Hub-spoke ]  [ ▭ Linear ] │   ← 3 icon buttons, active one
│                                                        │      gets ink-blue border
│  ┌────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │     [Resource Dependence]──shapes──>[Outcome]    │  │   ← rendered SVG, generated
│  │            │                                     │  │      server-side; frontend is a
│  │         explains                                 │  │      dumb <img>/inline-svg renderer
│  │            ▼                                     │  │
│  │     [Social Constructionism]                     │  │
│  │                                                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  Your framework combines Resource Dependence Theory     │   ← Source Serif narrative block
│  [Pfeffer & Salancik, 1978 ✓] with Social               │      citation chips inline, small
│  Constructionism [Berger & Luckmann, 1966 ✓] to          │      and unobtrusive (not full
│  explain how founders interpret external funding...      │      card-sized chips here)
│                                                        │
│  ↻ Swap a theory   ⎙ Export PNG   ⎙ Export Word   ⧉ Copy │   ← action row, ghost buttons
└──────────────────────────────────────────────────────┘
```

**Swap-theory state:** clicking "↻ Swap a theory" returns to stage 3a with current selections pre-checked, lets the student deselect one and pick another, then re-runs "Build my framework" — this regenerates *both* the diagram and the narrative together (never just one), since they're derived from the same selection and must stay consistent. Any downstream block that already exists (methodology, etc.) gets soft-invalidated and marked `⚠ outdated` per the locked ripple-effect decision in CLAUDE.md — never silently regenerated, never silently left stale.

---

## 5. Screen 4 — Methodology chain

**Priority: Sprint 4. Concept-level for now.**

### 5.1 State shape

```ts
{
  chain: Array<{
    step: 'paradigm' | 'methodology' | 'data_collection' | 'sample' | 'analysis',
    value: string,
    reasoning: string
  }>,
  paragraph: string
}
```

### 5.2 Wireframe

```
┌──────────────────────────────────────────────────────┐
│  Here's the methodology your framework points to —      │
│  and why each choice follows.                           │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ ◆ Paradigm                                       │  │
│  │   Interpretivist                                 │  │
│  │   Your framework treats meaning as constructed    │  │
│  │   socially, which points away from a purely        │  │
│  │   objectivist stance.                              │  │
│  │                                  ↻ Suggest alternative│
│  └────────────────────────────────────────────────┘  │
│            │                                          │   ← thin connecting line between
│            ▼                                          │      cards, signals "chain," not
│  ┌────────────────────────────────────────────────┐  │      a flat unordered list
│  │ ◆ Methodology                                    │  │
│  │   Qualitative, data-driven coding through         │  │   ← "grounded theory" referenced
│  │   grounded theory                                 │  │      as plain method text here,
│  │   Fits an interpretivist paradigm and a            │  │      not a re-selectable card —
│  │   framework built on socially-constructed          │  │      see §4.2 dual-role handling
│  │   meaning rather than fixed variables.              │  │
│  │                                  ↻ Suggest alternative│
│  └────────────────────────────────────────────────┘  │
│            │                                          │
│            ▼  ... (data_collection, sample, analysis cards, same pattern) ...
│                                                        │
│  Methodologically, this study takes an interpretivist   │   ← Source Serif paragraph,
│  approach, using [citation chips inline as in Screen 3]  │      same pattern as 4.3
│                                                        │
│              ⎙ Export   ⧉ Copy                         │
└──────────────────────────────────────────────────────┘
```

Each card: icon + step label (caption, uppercase-free) + `value` (H3) + `reasoning` (body, graphite color) + ghost "Suggest alternative" button bottom-right of the card only (not a global action — alternatives are per-step).

**Suggest-alternative state:** clicking it on a card doesn't replace the card immediately — it expands the card downward to show 1-2 alternative options as a small inline radio-card list (same pattern as Screen 2's radio-cards, smaller), with a "Use this instead" confirm. Collapses back to the single-value view once confirmed. This avoids a jarring full-card swap and keeps the reasoning ("why this follows") visible while comparing.

---

## 6. Screen 5 — Project dashboard (workspace mode)

**Priority: Sprint 5. Concept-level for now.**

### 6.1 State shape

```ts
{
  project: { name: string, degreeLevel: string, lastWorkedAt: string },
  blocks: Array<{
    id: 'question' | 'framework' | 'methodology' | 'guide' | 'analysis',
    status: 'done' | 'in_progress' | 'outdated' | 'locked' | 'empty',
    summary: string,
    version?: number
  }>,
  nextSuggestedStep: string
}
```

### 6.2 Wireframe — desktop

```
┌──────────────────────────────────────────────────────┐
│  Methea  ︵︶                          My Project ▾      │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  Next: review how your framework changed after   │  │  ← dark banner, ink bg,
│  │  swapping a theory.            [Review changes →] │  │     sheet-colored text,
│  └────────────────────────────────────────────────┘  │     prominent, top of page
│                                                        │
│  PLAN                                                 │   ← section header, caption,
│  ┌────────────────────────────────────────────────┐  │     pencil color, tracked wide
│  │ ✓ Research question          done                │  │
│  │   "How do solo founders decide on funding..."     │  │
│  │                                          Open →    │  │
│  ├────────────────────────────────────────────────┤  │
│  │ ⚠ Framework                  outdated  v2         │  │
│  │   Swapped Social Constructionism → ...            │  │
│  │                                Review changes →    │  │
│  ├────────────────────────────────────────────────┤  │
│  │ ○ Methodology                 empty                │  │
│  │   Not started — needs framework first               │  │
│  │                                       Locked 🔒      │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  COLLECT                                              │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🔒 Interview guide            locked                │  │
│  │   Available in v1.1                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ANALYSE                                              │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🔒 Findings                   locked                │  │
│  │   Available in v2                                  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 6.3 Status-card states

| Status | Icon | Card treatment | Action label |
|---|---|---|---|
| `done` | ✓ green | Normal border | "Open →" |
| `in_progress` | ◐ ink-blue | Normal border | "Continue →" |
| `outdated` | ⚠ amber | `--marker-yellow` left-edge accent stripe (4px), not full bg fill | "Review changes →" |
| `locked` | 🔒 pencil | Reduced opacity (~70%), no border emphasis | No action, or "Available in v1.1/v2" caption |
| `empty` | ○ stone outline | Normal border, dashed instead of solid | "Start →" if unblocked, or dependency note if blocked ("Needs framework first") |

The `outdated` treatment is intentionally a thin accent stripe, not a yellow card fill — per the brand's color-proportion rule (§1.2), a fully yellow card on a list of 5 reads as "something is broken," when the actual meaning is just "upstream changed, come look." Restraint here matters more than visibility.

### 6.4 Mobile behavior — the one mobile priority

This is the only screen styled for narrow viewport in MVP (everything else is desktop-first, editing happens on desktop). Mobile layout:

```
┌─────────────────────┐
│ Methea      Project ▾│
│                       │
│ ┌───────────────────┐ │
│ │ Next: review...    │ │
│ │      [Review →]    │ │
│ └───────────────────┘ │
│                       │
│ PLAN                  │
│ ✓ Question      done  │
│ ⚠ Framework  outdated │
│ ○ Methodology  empty  │
│                       │
│ COLLECT               │
│ 🔒 Guide      locked   │
│                       │
│ ANALYSE                │
│ 🔒 Findings   locked    │
└─────────────────────┘
```

Cards collapse to a single-line status row (icon + label + status word, summary text hidden) — tapping expands to show the summary and action, but the action itself ("Open", "Review changes") deep-links back to the relevant screen, which then renders its own desktop-oriented layout regardless of device. Per the locked decision in CLAUDE.md: **mobile = status viewing only**, not an editing surface — don't build a mobile-optimized version of Screens 1-4, route back to desktop-style screens even on a phone if a student insists on tapping through.

---

## 7. Things to NOT build in this track

- No infinite canvas / React Flow — framework diagram is static SVG, full stop, unless explicitly told otherwise
- No free-form AI chat sidebar — all AI interaction is structured (the screens above), never an open chat box
- No dark mode toggle — brand is light/paper by design, dark only appears in specific footer/CTA-band components (e.g. the dashboard's "next step" banner), not as a user setting
- No mobile editing flows — mobile shows read-only/deep-link status (Screen 5 styled for narrow viewport is the only mobile priority)
- No toast/modal-based validation — all errors are inline, in the field, in guidance tone (§1.5)

---

## 8. Handoff back to logic/backend track

Once a screen's UI is built with mock data, the integration point is: replace mock data with real Supabase reads/writes and real Claude API responses matching the same shape. If the UI session and the logic session agree on the `research_context` shape up front (see `CLAUDE.md`), this integration is mechanical, not a redesign.

Sequencing note from `SPRINT_ROADMAP_RECALIBRATED.md`: Screen 1 UI is Sprint 1 Day 1, Screen 2 UI is Sprint 1 Day 3 — both can be built in this standalone track ahead of the Claude-prompt/backend work landing in the same sprint, as long as both sessions are working from this document's state shapes.

---

*Created: June 2026 · Standalone frontend track, paste into a fresh chat session as needed*
*Updated: restructured into 5-screen Plan-layer spec (brief → gate 1 → framework builder incl. theory discovery → methodology chain → dashboard) with ASCII wireframes, full state matrices, and mobile/desktop behavior per each screen, ahead of Sprint 1.*
