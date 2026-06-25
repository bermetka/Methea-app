# Methea Theory Library — Content Plan

> Standalone content task. Run this in a separate chat or Cowork session, independent of the code sprints. Output is structured data (JSON or Markdown table) that gets seeded into Supabase once ready — no dependency on app code being built first.

## Why this is separate from code sprints

This is research and writing work, not engineering. Mixing it into coding sprints either blocks code progress waiting on content, or rushes the content. Treat it as its own deliverable with its own pace — ideally a parallel track, a few theories per session, not a single marathon.

## The non-negotiable constraint

**Every theory in this library must be real, verifiable, and properly attributed.** The AI in the product only ever suggests theories from this closed library — it never generates a theory or author name from training data at runtime. That makes this document the actual source of truth for what Methea can say is true. Sloppy entries here become hallucinations in the product later.

Before finalizing any entry, verify the author/year/core claim via OpenAlex or a direct search — don't rely on memory of "what this theory roughly says."

---

## Target: 40 theories for MVP

Covers the disciplines in the initial target market (business/management, sociology, education, development studies, psychology) with enough depth per discipline that students don't immediately hit "my theory isn't here." Budget content time accordingly — see hours estimate at the bottom of this document.

### The 40 — by discipline cluster

**Entrepreneurship & business (8)**
1. Effectuation theory — Sarasvathy, 2001
2. Institutional theory — Welter, 2011 / North, 1990
3. Resource-based view — Barney, 1991
4. Social capital theory — Bourdieu, 1986 / Putnam, 2000
5. Stakeholder theory — Freeman, 1984
6. Dynamic capabilities — Teece, Pisano & Shuen, 1997
7. Transaction cost economics — Williamson, 1981
8. Knowledge-based view of the firm — Grant, 1996

**Sociology & development studies (8)**
9. Social constructionism — Berger & Luckmann, 1966
10. Capability approach — Sen, 1999
11. Structuration theory — Giddens, 1984
12. Gender and entrepreneurship / gendered pathways — Brush et al., 2009
13. Postcolonial theory (research applications) — Said, 1978 / Spivak, 1988
14. Social exchange theory — Blau, 1964
15. Feminist standpoint theory — Harding, 1991
16. Dependency theory — Frank, 1967 / Wallerstein, 1974

**Education (8)**
17. Constructivist learning theory — Vygotsky / Piaget (synthesis entry)
18. Self-determination theory — Deci & Ryan, 1985
19. Communities of practice — Lave & Wenger, 1991
20. Threshold concepts — Meyer & Land, 2003
21. Transformative learning theory — Mezirow, 1991
22. Experiential learning theory — Kolb, 1984
23. Bronfenbrenner's ecological systems theory — Bronfenbrenner, 1979
24. Critical pedagogy — Freire, 1968

**Psychology (8)**
25. Social identity theory — Tajfel & Turner, 1979
26. Self-efficacy theory — Bandura, 1977
27. Theory of planned behaviour — Ajzen, 1991
28. Attachment theory (research applications) — Bowlby, 1969 / Ainsworth, 1978
29. Cognitive dissonance theory — Festinger, 1957
30. Self-categorization theory — Turner et al., 1987
31. Job demands-resources model — Demerouti et al., 2001
32. Health belief model — Rosenstock, 1966

**Cross-cutting / methods-adjacent theory (8)**
33. Sensemaking theory — Weick, 1995
34. Diffusion of innovations — Rogers, 1962
35. Actor-network theory — Latour, 2005
36. Technology acceptance model — Davis, 1989
37. Stakeholder salience theory — Mitchell, Agle & Wood, 1997
38. Practice theory — Bourdieu, 1990 / Schatzki, 2002
39. Grounded theory (as theoretical lens, not just method) — Glaser & Strauss, 1967
40. Critical realism — Bhaskar, 1975

This list is a starting hypothesis — swap entries based on what custdev interviews reveal students actually need.

---

## Entry template — fill exactly this shape for each theory

```json
{
  "name": "Effectuation theory",
  "author": "Sarasvathy",
  "year": 2001,
  "doi": "10.2307/259121",
  "plain_summary": "Explains how entrepreneurs make decisions when the future is uncertain — instead of starting from a fixed goal and finding the means to reach it, they start from the means they already have and let the goal emerge.",
  "key_concepts": [
    "Bird-in-hand (start with available means)",
    "Affordable loss (risk what you can afford, not what you might gain)",
    "Crazy quilt (build partnerships rather than competitive analysis)",
    "Lemonade principle (leverage surprises instead of avoiding them)"
  ],
  "disciplines": ["business", "entrepreneurship", "management"],
  "fits_when": "Research question is about decision-making under uncertainty, especially in resource-constrained or emerging-market contexts",
  "common_methodologies": ["case study", "narrative inquiry", "grounded theory"],
  "verified_source_check": "OpenAlex confirmed — Academy of Management Review, 2001"
}
```

### Field-by-field guidance

- **name**: the theory's common short name, not the paper title
- **author / year**: the originating work, not a textbook citation of it
- **doi**: pull this from OpenAlex directly, paste the actual DOI string
- **plain_summary**: one sentence, no jargon, would make sense to someone who's never heard of it. This is what builds trust — see the brand tone (co-constructive, never condescending)
- **key_concepts**: 3-5 terms a student would actually use as codes when analysing data with this framework
- **disciplines**: lowercase, matches the filter categories on the theory library screen
- **fits_when**: this is what powers the "why this fits YOUR research" reasoning — write it as a pattern-matchable condition, not a vague description
- **common_methodologies**: helps the methodology chain (Sprint 4) make a consistent recommendation
- **verified_source_check**: note here exactly how you confirmed it's real — this is an audit trail, not shown to users

---

## Workflow for writing each entry

```
1. Pick a theory from the 20-item list above
2. Search OpenAlex (or Google Scholar) for the originating paper
3. Confirm: author name spelling, year, journal, DOI
4. Write plain_summary — read it out loud, would a confused
   Masters student understand it in one read?
5. List 3-5 key_concepts as they'd appear in real coding
6. Write fits_when as a condition, test it against 2-3
   hypothetical research questions
7. Save as one JSON object, append to the library file
```

Budget roughly 30-45 minutes per theory once the pattern is warmed up. 40 theories ≈ 20-30 hours total — spread across multiple sessions, not a sprint. At 3-4h/day this is realistically 1.5-2 weeks of dedicated content time, run in parallel with the code sprints, not blocking them.

---

## Where to actually find these theories as a student (not as a developer)

This is the practical research workflow — the same one a Masters student doing a literature review would use, just applied to building this library instead of a thesis.

### Step 1: Don't start from Google — start from a textbook or handbook

For each discipline cluster, one good handbook or textbook gives you 80% of the foundational theories already organized and explained correctly. This is faster and more reliable than piecing together fragments from random websites.

```
Business/entrepreneurship:  "Entrepreneurship Theory and
                             Practice" journal's classic
                             papers list, or any MBA-level
                             strategy textbook's theory chapter
Sociology:                   "Sociological Theory" by
                             George Ritzer — standard
                             graduate textbook, covers
                             almost everything in the list above
Education:                   "Learning Theories" by
                             Dennis Coghlan / standard
                             ed-psych textbooks
Psychology:                  Any "Theories of Personality"
                             or social psychology textbook
                             (e.g. Myers' Social Psychology)
```

You likely have access to several of these for free or cheap via:
- Your own university library (even alumni often retain some access)
- Library Genesis (libgen) — for personal study use
- Google Books preview (often enough to confirm a definition)
- Open textbook initiatives: OpenStax, Open Textbook Library

### Step 2: Find the actual original paper via OpenAlex or Google Scholar

Once you know the theory name and rough author, go straight to the primary source — this is where you get the real DOI and confirm you're not misattributing.

```
1. Go to openalex.org (or scholar.google.com)
2. Search "[author name] [theory name]" — e.g. 
   "Sarasvathy effectuation"
3. The original paper is usually the most-cited result
   from the right decade
4. Click through, confirm: journal name, year, exact title
5. Copy the DOI directly from OpenAlex's result page
```

OpenAlex is better than Google Scholar for this specific task because it gives you a clean DOI and citation count without ads or scraper sites in the way.

### Step 3: Cross-check the plain-language summary against a secondary source

Don't write the plain_summary from the original paper's abstract alone — academic abstracts are often dense and jargon-heavy, which defeats the purpose. Instead:

```
1. Search "[theory name] explained simply" or 
   "[theory name] for dummies"
2. University library guides (libguides) often have
   excellent one-paragraph explanations aimed at
   undergrads — search "[university name] libguide 
   [theory name]"
3. Wikipedia's "Theory" articles are usually solid for
   a first-pass plain summary (verify against the 
   primary source, don't copy verbatim — copyright and
   accuracy both matter)
4. YouTube "two-minute" explainer videos are useful for
   sanity-checking that you've understood the core idea,
   not for citing
```

### Step 4: Validate the "fits_when" condition against real research questions

This is the step that's specific to building Methea's library, not a normal literature review. For each theory, write 2-3 hypothetical research questions where it would and wouldn't apply, and check your `fits_when` text actually discriminates between them. If you can't tell from your own description whether a given research question fits, the field needs to be more specific.

### A note on academic integrity for this specific task

Because this content ships inside a product that explicitly promises "we never invent citations," the verification step in Step 2 is not optional polish — it's the core trust mechanism of the whole product. Treat every entry as if a skeptical PhD supervisor will check it, because in practice, eventually, one will.

---

## Output format for handoff back to the app

Single file: `theories.json` — an array of the entry objects above. When ready,
this gets seeded into the Supabase `theories` table in one import. No schema
changes needed on the code side; Sprint 2's placeholder theories get replaced
wholesale by this file.

---

## What this content unlocks beyond the AI suggestion engine

Each entry doubles as content for the **public theory library pages** —
SEO-targeted at students panic-googling "[theory name] explained simply."
Same content, two jobs. Worth keeping `plain_summary` and `fits_when`
genuinely good prose, not just internal scaffolding — it will be read
directly by people who've never heard of Methea yet.

---

*Created: June 2026 · Standalone content track, run independently of code sprints*
