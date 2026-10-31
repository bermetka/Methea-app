# Theory content protocol

How Methea builds, verifies and publishes the "How to read this theory" content
shown in Gate 2: the theory's context, how it developed, its strands, strengths,
critiques, a must-read list and recent works.

The rule behind every step: **nothing reaches a student as fact unless a real,
verified work stands behind it.** This content is curated once per theory and
shared by every student. It is never generated per student at request time.

---

## 1. What one theory's content contains

Stored as one JSON file per theory: `content/theories/<slug>.json`
(shape: `content/theories/_template.json`).

| Block | What it holds | Size |
|---|---|---|
| Original work | Author(s), year, title, DOI / OpenAlex ID / ISBN | 1 work |
| Core idea | What the theory says, in plain English | 2–3 sentences |
| Key concepts | Already in the library (`theories.concepts`) | 3–6 |
| When to use it | Typical research questions, disciplines, data | 2–4 bullets |
| Common mistakes | How students misuse it | 2–3 bullets |
| Development | Key refinements after the original, oldest first | 3–5 works |
| Strands | Schools or branches, each with its defining work | 2–4 |
| Strengths | What it explains well, each tied to a source | 2–4 |
| Critiques | Main criticisms, each tied to the work that makes it | 2–4 |
| Must read | Original + key refinement + one review or handbook chapter | 3 works |
| Recent works | Pulled automatically from OpenAlex (§5), not curated | 3–5 |
| Verification log | Sources checked, by whom, when | — |

"Why it fits your question" is **not** part of this file. It already comes per
student from the theory suggestion step (`why_it_fits`), and Gate 2 shows it
next to this shared content.

---

## 2. Sources, in order of trust

| Use | Source | Why |
|---|---|---|
| Anchor and verify every work | **OpenAlex** | Free, open, DOI + citations + open-access location |
| Second check when OpenAlex misses | **Crossref** | DOI registry, authoritative metadata |
| Books (31 of 42 theories are pre-1995, mostly books) | **Open Library** (ISBN), WorldCat search link | Books often have no DOI |
| Finding what counts as a "development" | Review articles (OpenAlex `type:review`), handbooks (Sage, Oxford), Annual Reviews, Oxford Bibliographies, Stanford Encyclopedia of Philosophy | Expert consensus on how the theory evolved |
| Open-access link for the student | OpenAlex `best_oa_location` (Unpaywall data) | Never host or download PDFs ourselves |

**OpenAlex quota.** Since 2026 OpenAlex runs on a daily budget: $0.10/day without a key,
$1/day with a free key (openalex.org/settings/api, passed as `api_key=`). Single-work lookups
by ID or DOI are free; list/filter calls cost $0.10 per 1,000; keyword search $1 per 1,000.
The app needs `OPENALEX_API_KEY` in production for the recent-works lists and custom-theory search.

Claude's training memory is **not** a source. It may suggest where to look; every
name, year and title must then be found in OpenAlex, Crossref or Open Library.

---

## 3. Step by step, per theory

### Step 1 — Anchor the original
1. Search OpenAlex by title + first author + year.
2. Book or article not found → Crossref → Open Library (ISBN).
3. Record `openalex_id`, `doi` (if any), `isbn` (if book), exact title.
4. Still not found → status `?` (unverified). Keep it, flag it, never hide it.

**Matching traps found in the pilot (31 Oct 2026):**
- A search for a classic book often returns a *book review* of it (JSTOR `10.2307/…` records
  typed `journal-article`), a later chapter that only mentions it, or a reply to it.
  A book is matched only to a record of type book / monograph / edited-book / book-chapter
  whose title equals the book title. Never accept a fuzzy title match without checking it.
- Titles from memory can be wrong. Copy every title from the verified record.

### Step 2 — Find candidate developments
Collect candidates from three places:
- **Most-cited works citing the original**: OpenAlex `filter=cites:<W-id>`, `sort=cited_by_count:desc`, top 25.
- **Review articles and handbook chapters** on the theory: OpenAlex search `"<theory name>" type:review`, plus the handbooks above.
- **Named strands** that reviews treat as branches of the theory (e.g. institutional logics, institutional work for Institutional Theory).

### Step 3 — Cross-check and select 3–5 developments
A candidate goes in only if **all three** hold:
1. **Verified**: found in OpenAlex or Crossref with matching author, year, title.
2. **Named as a development**: at least one review or handbook (Step 2) describes it as refining, extending or branching the theory. Being highly cited alone is not enough: citing a work is not developing it.
3. **Adds something distinct**: a new mechanism, concept or scope, written in one line ("adds three mechanisms: coercive, mimetic, normative").

Tag each as `foundation` (a precursor the original builds on), `refinement`, `strand`
or `synthesis`. Order oldest first.

### Step 4 — Strands
2–4 schools or branches. Each needs a defining work that passed Step 3.

### Step 5 — Strengths and critiques (positive and negative)
- **Every critique names the verified work that makes it.** No "critics argue" without a source.
- **Every strength names a source** too: a review that credits it, or the empirical body it explains.
- **Balance**: at least 2 strengths and 2 critiques. Never only praise.
- Prefer critiques that matter for a student's design choice (e.g. "better at stability than change" → think twice for a study of change).
- Include internal debates between strands when they exist.

### Step 6 — Must read (3 works)
1. The original (or its most-read chapter, with chapter number).
2. The most important refinement from Step 3.
3. One review article or handbook chapter that maps the whole theory.

Each gets a generic one-line "why read" and **one reading question** the student
answers by reading (not by asking AI). Methea never summarizes these works.

### Step 7 — Write
- Plain English, short sentences, no jargon without a gloss.
- Explains the theory; never writes text a student would paste into a thesis.
- Every name, year and title copied from the verified record, not retyped from memory.

### Step 8 — Check (two passes)
**Machine pass** (script, `scripts/verify-theory-content.ts`):
- every work has `openalex_id` or `doi` or `isbn`
- author / year / title match the OpenAlex or Crossref record
- no duplicates; 3–5 developments; ≥2 strengths; ≥2 critiques; exactly 3 must-read
- every critique and strength has a `source`

**Human pass** (reviewer):
- Is the core idea right and fair?
- Are the developments the ones a specialist would name?
- Is anything important missing, especially a major critique?
- Would a student misread anything?

Reviewer signs off in the verification log (name, date).

### Step 9 — Publish
Statuses: `draft` → `verified` (machine pass) → `beta` → `reviewed` (human pass) → `published`.

`beta` (decided 31 Oct 2026): shown to students with the label "Draft guide, being checked…"
and an error-report link. Used so students get the cards before founder review is done;
the label goes when the card is `published`.
Only `published` content shows in Gate 2. A theory without it shows the existing
library summary and concepts, as today.

---

## 4. Verified-state vocabulary (same as everywhere in Methea)

- ✓ green = work found in OpenAlex / Crossref (or Open Library for books)
- ? gray = not found — shown, flagged, never hidden
- ⚠ amber = outdated (upstream changed)

---

## 5. Recent works (automatic, not curated)

Shown under "Beyond your list":
- OpenAlex: `filter=cites:<citation anchor W-id>,from_publication_date:<today − 10 years>,is_retracted:false,title_and_abstract.search:<terms>`
- `<terms>` = the student's topic terms (from her brief), so the list is about her topic, not just
  any highly cited paper that cites the classic. Without topic terms the sort returns generic
  famous papers (pilot: a Lancet commission for the capability approach). Fallback: the theory name.
- Sort by `cited_by_count:desc`, top 5. Show title, authors, year, ✓ chip, open-access link when `best_oa_location` exists.
- Cache per (theory, terms) for 7 days. Labelled "Recent works citing the original", never as developments.
- **Citation anchor.** For classic books OpenAlex often collects citations on an odd record (a 1967
  review, a later reprint chapter). The card stores `citation_anchor_openalex_id` separately from the
  bibliographic record and uses it only for this query.

---

## 6. Rollout

1. **Pilot**: Institutional Theory — check the format end to end.
2. **First wave**: the 10 theories students pick most (from `research_context.theories.selected_ids`).
3. **Rest of the library**: in batches of 8–10, each reviewed before publishing.

Theories without published content keep working exactly as now.

---

## 7. Open decisions

- Who does the human review pass (founder, or a methods lecturer for a sample)?
- Gate 2 question: keep "theory–timeline fit", or add "what would you lose if you dropped this theory?" when 2+ theories are chosen. (Changes a locked UX decision — needs an explicit yes.)
- Free or paid: theory context and reading list behind the paywall or not.

*Created 31 Oct 2026.*
