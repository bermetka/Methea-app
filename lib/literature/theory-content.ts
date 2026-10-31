import { THEORY_CARDS } from '@/content/theories'

/**
 * Curated "how to read this theory" cards (content/theories/*.json), built and verified
 * per docs/THEORY_CONTENT_PROTOCOL.md. Shared by every student; never generated per request.
 */

export interface CardWork {
  authors: string[]
  year: number | null
  original_year?: number   // first publication, when the record is a later edition/reprint
  title: string
  type?: string | null
  venue?: string | null
  doi: string | null
  openalex_id: string | null
  isbn?: string | null
  verified: boolean
  verified_in?: 'openalex' | 'crossref' | null
  oa_url?: string | null
  note?: string
}

export interface TheoryCardContent {
  library_name: string
  slug: string
  // 'beta' = shown to students with a 'being checked' label; 'published' = founder-reviewed
  status: 'draft' | 'verified' | 'reviewed' | 'beta' | 'published'
  original: CardWork
  citation_anchor_openalex_id: string | null
  core_idea: string
  when_to_use: string[]
  common_mistakes: string[]
  development: { kind: 'foundation' | 'refinement' | 'strand' | 'synthesis'; work: CardWork; adds: string }[]
  strands: { name: string; summary: string; defining_work: CardWork }[]
  strengths: { point: string; source: CardWork }[]
  critiques: { point: string; source: CardWork }[]
  must_read: { role: string; work: CardWork; chapter: string | null; why_read: string; reading_question: string }[]
  recent_search_term?: string
}

/**
 * Only founder-reviewed content reaches students in production. Preview deployments and
 * local dev also show drafts, so the founder can review cards inside the real screen.
 */
export function showDrafts(): boolean {
  return process.env.VERCEL_ENV !== 'production' && process.env.THEORY_CARDS_DRAFTS !== 'off'
}

export function theoryCard(libraryName: string): TheoryCardContent | null {
  const card = THEORY_CARDS[libraryName]
  if (!card) return null
  if (card.status === 'published' || card.status === 'beta' || showDrafts()) return card
  return null
}

/** OpenAlex IDs that tie a work to this theory: the original, its citation anchor, curated works. */
export function theoryAnchorIds(card: TheoryCardContent): Set<string> {
  const ids = new Set<string>()
  const add = (w?: CardWork | null) => { if (w?.openalex_id) ids.add(w.openalex_id) }
  add(card.original)
  if (card.citation_anchor_openalex_id) ids.add(card.citation_anchor_openalex_id)
  return ids
}

/** Every curated work on the card, for "You missed" and for matching the student's items. */
export function curatedWorks(card: TheoryCardContent): CardWork[] {
  const all = [
    card.original,
    ...card.development.map(d => d.work),
    ...card.strands.map(s => s.defining_work),
    ...card.must_read.map(m => m.work),
  ]
  const seen = new Set<string>()
  return all.filter(w => {
    const k = w.openalex_id ?? w.doi ?? w.title
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function cite(w: CardWork): string {
  const surnames = w.authors.map(a => (a.includes(',') ? a.split(',')[0] : a.split(' ').pop() ?? a).trim())
  const who = surnames.length > 2 ? `${surnames[0]} et al.` : surnames.join(' & ')
  return `${who} (${w.original_year ?? w.year ?? 'n.d.'})`
}
