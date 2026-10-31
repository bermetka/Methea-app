import type { VerifiedWork } from '@/types/database'
import { openAlexAuth } from '@/lib/openalex'

/**
 * Finding real works for a student's reading list.
 *
 * Matching is strict on purpose: a fuzzy title match on a classic book usually lands on a
 * review of it, a reprint chapter or a reply (see docs/THEORY_CONTENT_PROTOCOL.md). A wrong
 * ✓ is worse than an honest ?.
 *
 * Cost (OpenAlex 2026 pricing): lookups by ID/DOI are free, filter calls $0.10 per 1,000.
 * We never use the paid keyword `search=`; title matching goes through the
 * `title.search` filter, and Crossref (free) is tried first for items without a DOI.
 */

const OA = 'https://api.openalex.org'
const CROSSREF = 'https://api.crossref.org'
const UA = 'Methea/1.0 (mailto:bermet.ak@gmail.com)'
const WEEK = 60 * 60 * 24 * 7

export interface OpenAlexWork {
  id: string
  doi: string | null
  display_name: string
  publication_year: number | null
  type: string | null
  authorships: { author: { display_name: string } }[]
  primary_location?: { source?: { display_name?: string } | null } | null
  best_oa_location?: { landing_page_url?: string | null; is_oa?: boolean } | null
  open_access?: { is_oa?: boolean }
  referenced_works?: string[]
  abstract_inverted_index?: Record<string, number[]> | null
  cited_by_count?: number
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

export function normTitle(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Same title, or the found title is the student's title plus a subtitle. */
export function titlesMatch(wanted: string, found: string): boolean {
  const a = normTitle(wanted)
  const b = normTitle(found)
  if (!a || !b) return false
  if (a === b) return true
  // Student wrote the main title only; the record carries "Main title: subtitle".
  if (a.length >= 12 && b.startsWith(a + ' ')) return true
  // Student wrote "Main: subtitle"; record has the main title only (older records).
  if (b.length >= 12 && a.startsWith(b + ' ')) return true
  return false
}

/** True when any surname the student gave appears among the record's authors. */
export function authorsMatch(wanted: string[], found: string[]): boolean {
  if (!wanted.length) return true // nothing to check against; title + year must carry it
  const hay = normTitle(found.join(' '))
  return wanted.some(a => {
    const surname = normTitle(a.split(',')[0]).split(' ').filter(Boolean).pop() ?? ''
    return surname.length > 1 && hay.split(' ').includes(surname)
  })
}

export function yearsMatch(wanted: number | null, found: number | null, slack = 3): boolean {
  if (!wanted || !found) return true
  return Math.abs(wanted - found) <= slack
}

export function reconstructAbstract(inv: Record<string, number[]> | null | undefined): string | null {
  if (!inv) return null
  const words: string[] = []
  for (const [word, positions] of Object.entries(inv)) for (const p of positions) words[p] = word
  const text = words.filter(Boolean).join(' ').trim()
  return text || null
}

export function normalizeDoi(doi: string): string {
  return doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase()
}

export function shortId(openalexId: string): string {
  return openalexId.replace(/^https?:\/\/openalex\.org\//, '')
}

export function workFromOpenAlex(w: OpenAlexWork): VerifiedWork {
  const oaUrl = w.open_access?.is_oa ? (w.best_oa_location?.landing_page_url ?? null) : null
  return {
    openalex_id: shortId(w.id),
    doi: w.doi ? normalizeDoi(w.doi) : null,
    title: w.display_name,
    year: w.publication_year ?? null,
    authors: (w.authorships ?? []).map(a => a.author.display_name).slice(0, 6),
    venue: w.primary_location?.source?.display_name ?? null,
    oa_url: oaUrl,
    verified_in: 'openalex',
  }
}

/** Key used for read marks and de-duplication. */
export function workKey(w: { openalex_id: string | null; doi: string | null; title: string }): string {
  return w.openalex_id ?? (w.doi ? `doi:${w.doi}` : `t:${normTitle(w.title)}`)
}

// ── Network ───────────────────────────────────────────────────────────────────

const SELECT =
  'id,doi,display_name,publication_year,type,authorships,primary_location,best_oa_location,open_access,referenced_works,abstract_inverted_index,cited_by_count'

async function getJSON<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, next: { revalidate: WEEK } } as RequestInit)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** Free: single work by OpenAlex ID or DOI. Cached for a week (Next data cache). */
export async function openAlexWork(idOrDoi: string): Promise<OpenAlexWork | null> {
  const path = /^W\d+$/.test(idOrDoi) ? idOrDoi : `doi:${encodeURIComponent(normalizeDoi(idOrDoi))}`
  return getJSON<OpenAlexWork>(`${OA}/works/${path}?select=${SELECT}&${openAlexAuth()}`)
}

/** Free: Crossref bibliographic search; returns a DOI only for a strict match. */
async function crossrefDoi(title: string, authors: string[], year: number | null): Promise<string | null> {
  const q = encodeURIComponent(`${title} ${authors[0] ?? ''}`.trim())
  const data = await getJSON<{ message: { items: { DOI: string; title?: string[]; author?: { family?: string }[]; editor?: { family?: string }[]; issued?: { 'date-parts'?: number[][] }; type?: string }[] } }>(
    `${CROSSREF}/works?query.bibliographic=${q}&rows=8&select=DOI,title,author,editor,issued,type`,
    { headers: { 'User-Agent': UA } }
  )
  for (const it of data?.message?.items ?? []) {
    if (it.type === 'book-review' || it.type === 'peer-review') continue
    const t = it.title?.[0] ?? ''
    const people = [...(it.author ?? []), ...(it.editor ?? [])].map(a => a.family ?? '')
    const y = it.issued?.['date-parts']?.[0]?.[0] ?? null
    if (titlesMatch(title, t) && authorsMatch(authors, people) && yearsMatch(year, y, 1)) return normalizeDoi(it.DOI)
  }
  return null
}

/** Cheap filter call ($0.10 per 1,000): strict title + author match in OpenAlex. */
async function openAlexByTitle(title: string, authors: string[], year: number | null): Promise<OpenAlexWork | null> {
  const clean = title.replace(/[,|:]/g, ' ').trim()
  const yearFilter = year ? `,publication_year:${year - 3}-${year + 40}` : ''
  const data = await getJSON<{ results: OpenAlexWork[] }>(
    `${OA}/works?filter=title.search:${encodeURIComponent(clean)}${yearFilter}&sort=cited_by_count:desc&per_page=10&select=${SELECT}&${openAlexAuth()}`
  )
  const matches = (data?.results ?? []).filter(w => {
    // A review *of* the book carries the book's title; never accept it as the book.
    if (w.type === 'book-review' || w.type === 'paratext' || w.type === 'erratum') return false
    const names = (w.authorships ?? []).map(a => a.author.display_name)
    return titlesMatch(title, w.display_name) && authorsMatch(authors, names)
  })
  // OpenAlex often holds duplicates (reprints, repository copies). Prefer the record from
  // the year the student gave, then the most cited one (results are already sorted by that).
  if (year) {
    const sameYear = matches.find(w => w.publication_year && Math.abs(w.publication_year - year) <= 1)
    if (sameYear) return sameYear
  }
  if (matches[0]) return matches[0]
  return null
}

export interface LookupResult {
  work: VerifiedWork | null
  referenced: string[]            // OpenAlex IDs this work cites
  abstract: string | null
}

/**
 * Find one reading-list entry. Order: DOI in OpenAlex (free) → Crossref (free) → OpenAlex
 * title filter (cheap). Returns work: null when nothing matches strictly.
 */
export async function lookupWork(p: { title: string | null; authors: string[]; year: number | null; doi: string | null }): Promise<LookupResult> {
  const empty: LookupResult = { work: null, referenced: [], abstract: null }
  let w: OpenAlexWork | null = null

  if (p.doi) w = await openAlexWork(p.doi)
  if (!w && p.title) {
    const doi = await crossrefDoi(p.title, p.authors, p.year)
    if (doi) {
      w = await openAlexWork(doi)
      if (!w) {
        // Real DOI, but OpenAlex doesn't hold it: still verified, via Crossref.
        return {
          work: { openalex_id: null, doi, title: p.title, year: p.year, authors: p.authors, venue: null, oa_url: null, verified_in: 'crossref' },
          referenced: [],
          abstract: null,
        }
      }
    }
  }
  if (!w && p.title) w = await openAlexByTitle(p.title, p.authors, p.year)
  if (!w) return empty

  return {
    work: workFromOpenAlex(w),
    referenced: (w.referenced_works ?? []).map(shortId),
    abstract: reconstructAbstract(w.abstract_inverted_index),
  }
}

/**
 * Cheap filter call: works citing `anchorId`, last 10 years, matching the student's topic.
 * `terms` = topic terms followed by the theory name as the last element.
 */
export async function recentCiting(anchorId: string, terms: string[], n = 5): Promise<VerifiedWork[]> {
  const since = new Date().getFullYear() - 10
  const base = `${OA}/works?sort=cited_by_count:desc&per_page=${n}&select=${SELECT}&${openAlexAuth()}&filter=cites:${anchorId},from_publication_date:${since}-01-01,is_retracted:false`
  // Narrow by the student's topic first, then widen step by step. Terms are quoted as
  // phrases ("quality assurance" must not match "sustainability assurance").
  const q = (ts: string[]) => ts.map(t => `"${t.replace(/"/g, '')}"`).join(' ')
  const topic = terms.slice(0, -1)
  const theoryTerm = terms[terms.length - 1]
  const attempts = [
    q(terms),
    topic.length >= 2 ? q(topic.slice(0, 2)) : '',
    topic[0] ? q([topic[0], theoryTerm]) : '',
    topic[0] ? q([topic[0]]) : '',
  ].filter(Boolean)
  for (const t of Array.from(new Set(attempts))) {
    const data = await getJSON<{ results: OpenAlexWork[] }>(`${base},title_and_abstract.search:${encodeURIComponent(t)}`)
    if ((data?.results?.length ?? 0) >= 3) return data!.results.map(workFromOpenAlex)
  }
  return []
}
