# Methea — Sprint Roadmap (Recalibrated)

> Recalibrated against actual build speed: o-nion's core flow (create interview → voice record → transcribe → AI summary) took 3 days at 3-4h/day. This roadmap uses that as the real-world baseline instead of generic "week" estimates.

**Working assumption: 3-4 hours/day, weekdays only, ~17.5h/week.**

---

## What's in MVP vs deferred

To fit a realistic timeline before the SF trip, MVP scope is **Plan layer only**. Collect and Analyse layers move to v1.1/v2 — they need the Plan layer's `research_context` foundation anyway, so nothing is wasted by sequencing this way.

```
MVP (this roadmap):     PLAN layer — brief → framework →
                        methodology → narrative + export

v1.1 (after MVP users): COLLECT layer — interview guide,
                        transcript upload, Whisper transcription

v2 (after $3k MRR):     ANALYSE layer — AI coding, theme
                        synthesis, structured findings
```

This is a stronger SF pitch than a half-built full product: "live MVP solving the framework/methodology bottleneck, with paying users" beats "70%-built everything."

---

## Sprint-by-sprint (days, not weeks)

### Sprint 0 — Setup
**3-4 working days (~12-15h)**

```
Day 1:  Next.js 14 project init, reuse o-nion folder
        structure and config patterns
        Supabase project creation + auth (email + Google)
        — you've done this exact setup before, should be fast

Day 2:  Supabase schema: projects, frameworks, theories,
        research_context (versioned JSON) tables
        Claude API wrapper with streaming support

Day 3:  Landing page → app handoff (waitlist signups
        become first real accounts)
        Basic routing: /onboarding → /project/[id]

Day 4 (buffer): Test full auth + empty project flow
        end to end
```

**Definition of done:** User signs up, lands in an empty project shell, Claude API test call returns successfully.

---

### Sprint 1 — Brief upload + research question
**4-5 working days (~16-20h)**

```
Day 1:  Screen 1 UI: topic textarea + degree/discipline
        selects + optional reading-list paste field
        (this is mostly UI work — see UI_UX_SPEC.md,
        can be built in parallel by a frontend-focused session)

Day 2:  Claude prompt: extract topic + implied question
        + constraints from brief text
        Claude prompt: classify research type
        (exploratory/explanatory/descriptive)

Day 3:  Screen 2 UI: Socratic gate 1 — 4-question
        clarification flow with radio options
        State accumulation into research_context object

Day 4:  Wire up: brief → AI extraction → gate 1 → save
        to Supabase, test with 3-4 different sample briefs

Day 5 (buffer): Edge cases — empty brief, very short
        brief, non-English text handling
```

**Definition of done:** Student types or pastes a brief, answers 4 questions, a structured research brief is saved to `research_context`. AI correctly classifies intent in 8/10 manual test cases.

---

### Sprint 2 — Theory discovery engine (code only — content is separate, see THEORY_LIBRARY_PLAN.md)
**3-4 working days (~12-15h)**

```
Day 1:  Supabase theories table schema (name, author,
        year, summary, concepts, disciplines, doi)
        Seed with 8-10 placeholder theories to develop
        against while full library is written separately

Day 2:  Claude prompt: match research_context → top 5
        theories from library with "why this fits" reasoning
        Screen 3 UI: suggested-first theory cards +
        "browse full library" link

Day 3:  OpenAlex API integration: verify theory citations
        on selection → show DOI, verified chip
        Reading-list paste matching (fuzzy match against
        OpenAlex, three-way labels)

Day 4 (buffer): Test discovery engine against 10+ different
        research questions across disciplines once more
        theories are in the library
```

**Definition of done:** Given a research_context, AI suggests 3-5 theories from the library with plain-language reasoning. OpenAlex verification returns DOI for known theories within ~2s.

**Note:** This sprint can start with placeholder theories and swap in the real 40-theory library as it's written (parallel track — see THEORY_LIBRARY_PLAN.md, run in a separate chat/Cowork session). Content track is ~20-30 hours total, doesn't block this sprint's code.

---

### Sprint 3 — Framework builder + export
**4-5 working days (~16-20h)**

```
Day 1:  Static SVG auto-layout: 3 layout presets
        (hierarchy / hub-and-spoke / linear) for 2-4
        selected theories
        Claude prompt: generate relationship labels
        between theory pairs (shapes/moderates/explains)

Day 2:  Claude prompt: generate framework narrative
        paragraph with citations
        Anti-hallucination guard: every citation in
        narrative → background OpenAlex check → flag
        if unverified

Day 3:  Export: SVG → PNG (lossless, this is the
        guaranteed-match-export decision from brand spec)
        Export: narrative → Word doc (docx npm)

Day 4:  "Swap theory" flow: changing a theory regenerates
        diagram + narrative together via research_context
        Soft-invalidation marking on downstream blocks
        (even though methodology/etc. don't exist yet in
        MVP, the versioning pattern needs to exist now)

Day 5 (buffer): Visual polish pass — apply brand system
        tokens (see UI_UX_SPEC.md), test PNG export
        quality at actual print resolution
```

**Definition of done:** Student sees an auto-laid-out framework diagram with relationship labels, a citation-verified narrative paragraph, and can export both as PNG/Word. Swapping a theory regenerates both consistently.

---

### Sprint 4 — Methodology chain
**3 working days (~12h)**

```
Day 1:  Claude prompt: derive paradigm → methodology →
        data collection → sample → analysis method from
        research_context (framework + research type)
        Screen 5 UI: methodology chain cards, each with
        value + "why this follows" reasoning

Day 2:  Claude prompt: generate methodology paragraph
        with citations (same anti-hallucination guard
        as Sprint 3)
        "Suggest alternative" flow

Day 3 (buffer): Consistency testing — confirm a
        qualitative framework never recommends surveys,
        deductive approach never recommends pure grounded
        theory. Run 15-20 test cases.
```

**Definition of done:** Methodology recommendation is logically consistent with the framework in all test cases. Methodology paragraph exports alongside framework narrative.

---

### Sprint 5 — Dashboard + freemium + launch prep
**4-5 working days (~16-20h)**

```
Day 1:  Project dashboard (workspace mode): status cards
        for each Plan-layer block, "next suggested step"
        banner — this is the wizard→workspace transition
        from locked UX decisions

Day 2:  Lemon Squeezy integration: Free tier (1 project,
        no export) vs Project tier ($49, full export)
        Paywall gate on PNG/Word export + methodology reveal

Day 3:  Education layer: contextual [?] tooltips at
        first mention of deductive/inductive, conceptual/
        theoretical/analytical framework distinctions

Day 4:  Public theory pages (SEO) — auto-generate from
        theory library entries once content exists
        Basic error states, loading states, empty states polish

Day 5 (buffer): End-to-end test: signup → brief → gate 1
        → theories → framework → methodology → paywall
        → payment → export. Fix what breaks.
```

**Definition of done:** Full Plan-layer flow works end to end. Free user hits paywall at export. Paid user completes full flow and downloads Word doc.

---

## Total realistic estimate

```
Sprint 0:  3-4 days
Sprint 1:  4-5 days
Sprint 2:  3-4 days  (code only, content runs parallel)
Sprint 3:  4-5 days
Sprint 4:  3 days
Sprint 5:  4-5 days
──────────────────
Total:     21-26 working days

At 5 days/week:  ~4.5-5 weeks
At 3-4h/day:     ~75-100 hours total
```

**This replaces the earlier "11 weeks" estimate** — that number applied a generic 2-2.5x slowdown multiplier without accounting for how much of this reuses patterns already proven in o-nion (auth, Claude API calls, Supabase CRUD). The realistic number, calibrated to your actual demonstrated speed, is **~5 weeks of calendar time**, not 11.

Buffer days are built into each sprint (roughly 20% of each sprint's time) rather than added separately — this tends to be more accurate than a single buffer at the end.

---

## What could blow this estimate up

Honest risks to the 5-week number, ranked by likelihood:

1. **OpenAlex fuzzy matching tuning** — getting reading-list matching accurate enough to trust takes iteration. Could add 2-3 days to Sprint 2.
2. **SVG auto-layout edge cases** — 2 theories vs 4 theories vs theories with long names all need to look good. Could add 1-2 days to Sprint 3.
3. **Context-switching cost** — if frontend work happens in a separate chat/session in parallel (see UI_UX_SPEC.md), integration days are needed that aren't itemized above. Budget +3-4 days total across the roadmap for integration.
4. **You're also running validation + o-nion in parallel** — this roadmap assumes Methea gets the full 3-4h/day. If validation interviews or o-nion work compete for that time in a given week, the timeline stretches proportionally — it doesn't break, it just slides.

---

*Created: June 2026 · Recalibrated from generic week-based estimate to actual demonstrated build speed*
