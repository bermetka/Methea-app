# Reading list + theory explanation (Gate 2) — mini-PRD

*31 Oct 2026 · status: awaiting approval · branch `feat/reading-list`*

## What
After the student picks theories, Gate 2 shows a card for each theory with three parts:
- what the theory is and how it developed;
- what to read;
- a check of the student's own reading list: is each work real, and how does it connect to her
  theories, framework and research question?

## Why
Custdev, Oct 2026:
- **5 of 6 teachers** asked for a reading list.
- **4 voices** said the library is too narrow.
- **4 voices** said "ChatGPT does the same".

Market scan: no tool tells a student what to read for her own theory, or checks her own list
against it. Positioning: others read for the student; Methea says what to read and why, and
checks what she already has.

## Scope — in
1. **Theory card.** Curated content per `THEORY_CONTENT_PROTOCOL.md`: core idea, development,
   strands, strengths and critiques with sources, 3 must-read works with reading questions.
   Only theories the founder has reviewed get the full card. The rest keep today's summary.
2. **Recent works.** Pulled from OpenAlex: works citing the original that also match the
   student's topic terms, last 10 years, top 5 by citations, cached for 7 days per theory+topic.
   Without the topic filter the list is generic famous papers (found in the pilot).
3. **Student's reading list: verification.** The student pastes her list on the brief step or
   adds it in Gate 2.
   - Claude (fast model) only splits her text into items: author, year, title, DOI. It adds
     nothing she didn't write.
   - Each item is checked:
     1. DOI in OpenAlex (free);
     2. otherwise Crossref search (free);
     3. otherwise OpenAlex search (paid; see Cost).
   - Result chip: ✓ found, or ? not found. Unfound items are shown and flagged, never hidden.
4. **Student's reading list: connections.** For each verified item:
   - **Link to a theory (machine evidence).** The item cites the theory's original
     (`referenced_works` in OpenAlex), or it is one of the curated works on the theory card.
     Label: "Builds on Institutional Theory · cites DiMaggio & Powell 1983".
   - **Link to framework and question (abstract-based).** Claude reads only the item's title and
     its OpenAlex abstract, and tags which of her framework concepts it speaks to. It quotes the
     phrase from the abstract as evidence. No abstract → "Can't assess: no abstract available"
     (gray chip).
   - Claude never summarizes the work, never rates its quality and never says what the student
     should conclude from it. She decides; the card shows the evidence.
5. **Placement.** Inside each theory card, a reading-list block with three labels:
   - **In your list:** her items linked to this theory, with ✓/? chips and evidence.
   - **You missed:** curated must-read works that are not in her list.
   - **Beyond your list:** recent works from the auto-list.

   Below all cards, a block **"Not linked to your chosen theories"**. Her items that fit no
   chosen theory may mean a theory is missing; we say so neutrally.
6. **Read marks.** The student ticks works as read. This is soft gating: Methea nudges her to
   read before methodology but never blocks her.
7. **Storage.**
   - Verification results and links go into `research_context.theories.reading_list_items`,
     which already exists; we extend it.
   - Theory content lives in repo JSON.
   - If the student swaps a theory or edits the framework, links are marked ⚠ outdated with
     [Review changes]. Nothing is regenerated silently.

## Scope — out
- PDF upload and reading full texts (v1.1).
- Summaries of papers, quality scores, "AI picks better papers" from training data.
- Free-form chat about the literature.
- Building the full curated library in one go. Content ships in batches:
  1. pilot;
  2. top 10;
  3. the rest.

## Decisions needed
1. **Gate 2 question.** Keep "theory–timeline fit", or add "what would you lose if you dropped
   this theory?". This changes a locked decision and needs an explicit yes.
2. **Free vs paid.** Build behind a switch; decide later.
3. **Maximum list length per project.** Proposed: 40 items.
4. **OpenAlex API key** (free) in Vercel as `OPENALEX_API_KEY`. The founder creates it.

## Cost (OpenAlex, 2026 pricing)
| Request | Price |
|---|---|
| Single work by ID or DOI | free |
| List / filter | $0.10 per 1,000 |
| Keyword search | $1 per 1,000 |

- A free key covers $1/day.
- A 20-item list costs at most $0.02. Most items resolve through DOI or Crossref (both free)
  and the cache: works already found for other students are not searched again.
- Worst case is about $0.03 per project, which is under 0.1% of the $49 price.

## Output (done when)
- Gate 2 shows a theory card with reading list and three labels.
- Her items carry ✓/? chips, theory links with citation evidence, and concept tags with quoted
  abstract evidence.
- Read marks are stored.
- Unreviewed theories still work as today.
- Top-10 theory content is reviewed and published.

## Estimate
- **Code:** 3–4 days.
  - Gate 2 screen and read marks: 1 day.
  - List parsing and verification pipeline with cache: 1 day.
  - Theory links and abstract concept tags: 1 day.
  - Outdated flags, tests, polish: 0.5–1 day.
- **Content:** in parallel. Pilot (Institutional Theory) is drafted; the other 9 of the top 10
  follow, then founder review.
