import type { StudentListItem, Theory } from '@/types/database'
import { lookupWork, openAlexWork, shortId } from './works'
import { theoryCard, theoryAnchorIds, curatedWorks, cite } from './theory-content'
import { tagConcepts, type ParsedRef } from '@/lib/prompts/reading-list'

/** Run `fn` over items with at most `limit` in flight (polite to OpenAlex/Crossref). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

interface TheoryAnchors {
  theory: Theory
  label: string                 // "DiMaggio & Powell (1983)"
  anchors: Set<string>          // OpenAlex IDs of the original (and its citation anchor)
  curated: Map<string, string>  // OpenAlex ID → citation, for works on the Methea card
}

/** Resolve what counts as "this theory" in OpenAlex, for each selected theory. */
export async function theoryAnchors(theories: Theory[]): Promise<TheoryAnchors[]> {
  return Promise.all(
    theories.map(async t => {
      const card = theoryCard(t.name)
      const anchors = card ? theoryAnchorIds(card) : new Set<string>()
      if (t.openalex_id) anchors.add(shortId(t.openalex_id))
      if (!anchors.size && t.doi) {
        const w = await openAlexWork(t.doi) // free lookup
        if (w?.id) anchors.add(shortId(w.id))
      }
      const curated = new Map<string, string>()
      if (card) for (const w of curatedWorks(card)) if (w.openalex_id) curated.set(w.openalex_id, cite(w))
      const label = card ? cite(card.original) : `${t.author} (${t.year})`
      return { theory: t, label, anchors, curated }
    })
  )
}

/**
 * Check every entry of the student's list: is it real, does it build on her theories, and
 * which of her concepts does its abstract speak to. Nothing here writes about the works;
 * it only attaches evidence (a citation link, a verbatim quote).
 */
export async function checkStudentList(
  parsed: ParsedRef[],
  theories: Theory[],
  concepts: string[],
  question: string
): Promise<StudentListItem[]> {
  const anchors = await theoryAnchors(theories)

  const looked = await mapLimit(parsed, 5, p => lookupWork({ title: p.title, authors: p.authors, year: p.year, doi: p.doi }))

  const items: StudentListItem[] = parsed.map((p, i) => {
    const { work, referenced } = looked[i]
    const refs = new Set(referenced)
    const links: StudentListItem['theory_links'] = []
    if (work?.openalex_id) {
      for (const a of anchors) {
        if (a.anchors.has(work.openalex_id)) links.push({ theory_id: a.theory.id, evidence: `This is the original work of ${a.theory.name}` })
        else if (a.curated.has(work.openalex_id)) links.push({ theory_id: a.theory.id, evidence: `Listed on the Methea card for ${a.theory.name}` })
        else if (Array.from(a.anchors).some(id => refs.has(id))) links.push({ theory_id: a.theory.id, evidence: `Cites ${a.label}` })
      }
    }
    return {
      id: `r${i + 1}`,
      raw: p.raw,
      parsed: { authors: p.authors, year: p.year, title: p.title, doi: p.doi },
      status: work ? 'verified' : 'unverified',
      work,
      theory_links: links,
      concept_tags: [],
      abstract_available: !!looked[i].abstract,
    }
  })

  // One Claude call for all works that have an abstract.
  const withAbstract = items
    .map((it, i) => ({ it, abstract: looked[i].abstract }))
    .filter((x): x is { it: StudentListItem; abstract: string } => !!x.abstract && !!x.it.work)
  try {
    const tags = await tagConcepts(
      withAbstract.map(x => ({ key: x.it.id, title: x.it.work!.title, abstract: x.abstract })),
      concepts,
      question
    )
    for (const x of withAbstract) x.it.concept_tags = tags[x.it.id] ?? []
  } catch (err) {
    // Tags are a bonus; verification and theory links still stand without them.
    console.error('[reading-list] concept tagging failed:', err)
  }

  return items
}
