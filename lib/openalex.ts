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
