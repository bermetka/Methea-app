import type { Theory } from '@/types/database'
import type { VerificationStatus } from '@/components/ui/StatusChip'

const OPENALEX_BASE = 'https://api.openalex.org'
const MAILTO = 'bermet.ak@gmail.com'

export async function verifyTheory(theory: Theory): Promise<VerificationStatus> {
  // Pre-DOI classics — verified by inclusion in our curated library
  if (!theory.doi || (theory.year !== null && theory.year < 1995)) {
    return { kind: 'classic_verified', source: `${theory.author}, ${theory.year} — confirmed via curated library` }
  }

  try {
    const url = `${OPENALEX_BASE}/works/doi:${encodeURIComponent(theory.doi)}?mailto=${MAILTO}`
    const res = await fetch(url, { next: { revalidate: 86400 } })

    if (!res.ok) return { kind: 'unverified' }

    const data = await res.json()
    if (data?.doi) {
      return { kind: 'doi_verified', doi: data.doi }
    }
    return { kind: 'unverified' }
  } catch {
    return { kind: 'unverified' }
  }
}

export function isInReadingList(theory: Theory, readingListRaw: string): boolean {
  if (!readingListRaw) return false
  const haystack = readingListRaw.toLowerCase()
  const surname = theory.author.split(/[,&]/)[0].trim().toLowerCase()
  return haystack.includes(surname)
}

// ── Bring-your-own citation verification ──────────────────────────────────────

export interface CitationLookup {
  verified: boolean
  meta?: { name: string; author: string; year: number | null; doi: string | null; title: string }
}

function normalizeDoi(raw: string): string {
  return raw.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '')
}

// Extract first-author surname + year + title from an OpenAlex work JSON object.
function metaFromWork(w: any): NonNullable<CitationLookup['meta']> {
  const display = w?.authorships?.[0]?.author?.display_name ?? ''
  const surname = display ? display.split(' ').slice(-1)[0] : 'Unknown'
  const title = w?.title ?? w?.display_name ?? ''
  return {
    name: title || 'Untitled work',
    author: surname,
    year: typeof w?.publication_year === 'number' ? w.publication_year : null,
    doi: w?.doi ? normalizeDoi(w.doi) : null,
    title,
  }
}

/**
 * Verify a bring-your-own citation. DOI-first (exact match via OpenAlex works),
 * then a title/free-text search fallback (best single match). Returns
 * verified:false with no meta when nothing is found — the caller must then show
 * a "?" chip and never present the citation as fact.
 */
export async function verifyCitation(input: { doi?: string; text?: string }): Promise<CitationLookup> {
  const doi = input.doi ? normalizeDoi(input.doi) : ''
  try {
    if (doi) {
      const res = await fetch(
        `${OPENALEX_BASE}/works/doi:${encodeURIComponent(doi)}?mailto=${MAILTO}`,
        { next: { revalidate: 86400 } }
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.id) return { verified: true, meta: metaFromWork(data) }
      }
    }
    const text = (input.text ?? '').trim()
    if (text) {
      const res = await fetch(
        `${OPENALEX_BASE}/works?search=${encodeURIComponent(text)}&per-page=1&mailto=${MAILTO}`,
        { next: { revalidate: 86400 } }
      )
      if (res.ok) {
        const data = await res.json()
        const w = data?.results?.[0]
        if (w?.id) return { verified: true, meta: metaFromWork(w) }
      }
    }
  } catch {
    /* fall through to unverified */
  }
  return { verified: false }
}
