# Methea — Project Context for Claude Code

## What this is

Methea guides Masters and PhD students from assignment brief to structured
research findings. It is a **process tool, not an output tool** — it scaffolds
the student's thinking (framework, methodology, instruments, analysis) but
never writes the discussion, conclusion, or final report for them.

Tagline: "Your research, methodically."

Related product: o-nion (async voice customer research for founders) — shares
the same underlying infrastructure (Next.js, Supabase, Claude API, Whisper).

## Current status

Pre-build. Running a 14-day validation sprint (Reddit, Threads, o-nion async
interviews, Erasmus network) before writing Sprint 0 code. Do not generate
production scaffolding until told validation gate is passed.

Landing page already live (Next.js + Supabase waitlist) at
methea-landing-git-main-bermet-koshoevas-projects.vercel.app — repo:
github.com/bermetka/methea-landing

## Core positioning — read before writing any copy or feature logic

| Student arrives with | Student leaves with | Student writes herself |
|---|---|---|
| Topic + TOR/brief | Complete research proposal | Discussion chapter |
| Minimal methods knowledge | Data collection instruments | Conclusion |
| Assignment deadline | Analysed findings | Final report |

**The line we never cross:**
- Product DOES: structured findings, framework fit, research gap, citation verification
- Product NEVER: writes discussion/conclusion, interprets meaning, generates final report text

This distinction is what makes Methea a tool universities recommend instead of ban.
Never build or suggest a feature that writes prose the student would submit as their own.

## Architecture — three layers

```
PLAN
├── Upload TOR/brief (+ optional: paste reading list)
├── [Socratic gate 1] Research question refinement (1-2 exchanges)
├── Theory discovery — suggested-first, browse-second (40-theory library)
│   └── three-way reading list labels (in list / beyond list / missed)
├── [Socratic gate 2] Theory-timeline fit check (1 question)
├── Visual framework builder — static SVG, 3 layout presets
│   └── narrative with OpenAlex-verified citation chips
├── Methodology recommendation — chain with WHY at each step
└── Literature synthesis + gap identification (v1.1, needs PDF upload)

COLLECT
├── Interview guide — 10-15 questions, each tagged to framework concept
├── Participant tracker (v1.1)
├── Whisper transcription — reuse o-nion (v1.1)
└── Field notes, observation protocol, focus group guide (v2)

ANALYSE
├── Transcript upload (.txt, .docx, .pdf)
├── AI coding against framework — deductive + inductive flags
├── [Socratic gate 3] Validate themes with student
├── Theme synthesis — themes + quotes + frequency
└── Structured findings output — AI surfaces, student interprets
```

## The three Socratic gates — non-negotiable UX pattern

| Gate | Moment | Purpose |
|---|---|---|
| 1 | After brief upload | Sharpen research question |
| 2 | After theory selection | Check theory-timeline fit |
| 3 | After AI coding | Validate themes before finalising |

AI co-constructs, never interrogates. Every screen starts from what the
student brought ("Based on your brief, your question seems to be...") —
never makes them feel they're starting from zero.

## UX architecture decisions — LOCKED, do not relitigate without explicit ask

1. **Navigation:** Wizard (linear, first pass) → Workspace dashboard (status
   cards, after first pass). Both states must exist in the data model from day one.
2. **Ripple effect:** Soft invalidation + versioning. When upstream changes
   (e.g. swap a theory), downstream blocks get marked "⚠ outdated" with a
   [Review changes] diff. Never auto-regenerate silently (loses edits), never
   leave silently inconsistent. Requires `research_context` to store versions
   + dependency links from Sprint 0.
3. **AI pattern:** Embedded, no free-form chat in MVP. Socratic gates are
   structured dialogues at fixed points, not open chat.
4. **Verified states — single visual vocabulary everywhere:**
   - ✓ green chip = verified citation (DOI found via OpenAlex)
   - ? gray chip = unverified — flag, never hide
   - ⚠ amber chip = outdated (upstream changed)
5. **Latency:** short generations stream; long jobs (transcript coding) are
   async background jobs + notification.
6. **Viewport:** single column, max-width ~720px, 13" laptop first. No
   sidebars in MVP. Mobile = status viewing only, not working.
7. **Export-first:** what the student sees in the framework diagram is
   exactly what exports to PNG/Word. Never let in-app and exported versions diverge.

## Critical technical constraints

- **Theory library is closed and curated.** AI only suggests theories that
  exist in the library — never generates author names or citations from
  training data. This is the #1 risk mitigation (hallucinated citations kill
  trust with academic users instantly).
- **OpenAlex/CrossRef verification** runs on every citation before it's shown
  to the student. Free, no-auth REST APIs (~100k req/day). Add `mailto` param
  for polite pool. Three scenarios: library theory verification, reading-list
  fuzzy matching, anti-hallucination guard on generated narrative citations.
- **`research_context`** is the single central versioned JSON object in
  Supabase. Every sprint reads from it and writes to it. This is what
  guarantees consistency — the framework concepts selected in Sprint 2 are
  the exact same concepts used for interview questions in Sprint 5 and coding
  in Sprint 6. Do not create parallel state stores.
- **Static SVG, not canvas**, for the framework diagram in MVP. React Flow /
  infinite canvas is an explicitly deferred v1.5 feature — do not build it
  unless asked. Reason: static auto-layout fully serves the job in 2-3 days
  of dev vs 2-3 weeks for canvas, and SVG→PNG export is lossless.

## Tech stack

```
Frontend:      Next.js 14 (App Router), single-column 720px
Database:      Supabase (+ background jobs for async transcript coding)
Auth:          Supabase Auth (email + Google OAuth)
AI:            Claude API (Sonnet, structured JSON, streaming for short gens)
Verification:  OpenAlex + CrossRef APIs
Transcription: Whisper API (reuse o-nion) — v1.1
File parsing:  Mammoth.js (docx), pdf-parse (PDF)
Export:        SVG→PNG, docx npm (Word), jsPDF (PDF)
Payments:      Lemon Squeezy (decided over Paddle for simpler $19/$49 SKUs)
Hosting:       Vercel
```

## Brand system — apply when touching any UI/copy

**Identity:** Methea = METHod + THEa (Greek goddess of sight). "Ink on paper,
marker in hand." Playfair Display (display/logo) + Schibsted Grotesk (UI) +
Source Serif 4 (long-form reading). Logo wordmark uses tight tracking
(-4.5% on wordmark, -2.5% display, -1.5% headings) with an organic lime
marker-stroke SVG underline — never recolour it, never use the stroke
without the word except as favicon.

**Colour roles — strict, ~70% paper / ~25% ink / ~5% marker:**
- Paper (`#F6F2E8` family): backgrounds only
- Ink (`#1C1C1C`, `#4A4A47`, `#11425D`): text, logo, buttons
- Marker (`#FFE66D` yellow, `#DDFF55` lime, `#B7F171` green): highlights
  only — never as fill for large areas or buttons

**Tone:** co-constructive, never interrogative. Precise, not cold. Reasoned,
always — every AI suggestion ships with its "why." Calm under deadline (the
user is anxious at 2am). See `/docs/methea-brandbook-v2.html` for full
do/don't microcopy examples.

## Pricing (subject to validation)

```
Free:         1 project, framework builder, full education layer — no export
Project:      $49 one-time — all features, 5 transcripts, valid until done
Researcher:   $19/mo — unlimited projects + transcripts
Institution:  $299/mo — unlimited students, supervisor dashboard
```

$49/project is the hypothesis, not confirmed — students think in projects,
not months, and no competitor (fastwrite, Rescrito, Blainy, Heuristica,
CiteMe) offers project-based pricing. Validation interviews are actively
testing willingness-to-pay as of this writing.

## Competitors — know the landscape before suggesting features

| Product | What they do | Relation |
|---|---|---|
| SciSpace / Elicit | Literature discovery + extraction | Complement, not compete |
| NVivo / MAXQDA | Manual deep QDA | Don't compete on desktop QDA |
| fastwrite / Blainy | AI writing assistant in Word | Different stage (writing) |
| Rescrito | Writes essays + "humanizes" AI text | Anti-positioning — what we are NOT |
| Heuristica | General concept maps | UX reference only |
| CiteMe | Citation verification | Validates our OpenAlex approach |

Never suggest building toward "AI writes the essay" or "humanize this text"
features — that crosses the line above and is the exact thing that gets
tools banned by universities.

## When in doubt

1. Does this feature help the student think, or does it think for them? If
   the latter, don't build it without flagging the concern explicitly.
2. Does this citation/theory come from the closed library or get verified
   via OpenAlex? If neither, don't surface it as fact.
3. Does this change require updating `research_context` schema? If yes,
   think about versioning/dependency links before writing the migration.
4. Is this consistent with the locked UX decisions above? If you want to
   deviate, say so explicitly and explain why — don't silently drift.

Full product history, all mockups (8 screens), and the complete brandbook are
in `/docs` — read `RESEARCH_COMPASS_SUMMARY_v2.md` first for full context if
something here is ambiguous.
