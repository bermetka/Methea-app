// What an unpaid project sees in Reading (Gate 2) — paywall option 2 (2026-11-04):
// the theory explainer stays free (education layer); the first FREE_MUST_READS core
// readings per theory come in full; the rest show their titles only. One recent work
// per theory; the rest as a count. Her own list: the summary and one linked work; the
// per-work breakdown is paid. Applied on the server, so locked text never reaches the page.

import type { StudentReadingList, VerifiedWork } from '@/types/database'
import type { CardWork, TheoryCardContent } from '@/lib/literature/theory-content'

export const FREE_MUST_READS = 2
export const FREE_RECENT = 1

export interface ListPreview {
  total: number
  verified: number
  linked: number
  /** theory id → how many of her works link to it */
  linkedByTheory: Record<string, number>
}

/** A theory's reading for an unpaid project: free part + the titles/count of what is locked. */
export function gateTheoryReading(
  card: TheoryCardContent | null,
  recent: VerifiedWork[],
  paid: boolean
): { card: TheoryCardContent | null; recent: VerifiedWork[]; lockedReads: CardWork[]; lockedRecent: number } {
  if (paid) return { card, recent, lockedReads: [], lockedRecent: 0 }
  const reads = card?.must_read ?? []
  return {
    card: card ? { ...card, must_read: reads.slice(0, FREE_MUST_READS) } : null,
    recent: recent.slice(0, FREE_RECENT),
    lockedReads: reads.slice(FREE_MUST_READS).map(m => m.work),
    lockedRecent: Math.max(0, recent.length - FREE_RECENT),
  }
}

/**
 * Her checked list for an unpaid project: every item keeps what she wrote (it's
 * hers, and Methea uses it to know what she already has), but the analysis — theory
 * links and concept tags — is kept only on the first linked work.
 */
export function gateStudentList(
  list: StudentReadingList | null,
  paid: boolean
): { list: StudentReadingList | null; preview: ListPreview | null } {
  if (!list || paid) return { list, preview: null }
  const linkedByTheory: Record<string, number> = {}
  for (const i of list.items) for (const l of i.theory_links) linkedByTheory[l.theory_id] = (linkedByTheory[l.theory_id] ?? 0) + 1
  const firstLinked = list.items.find(i => i.theory_links.length > 0)?.id ?? null
  const preview: ListPreview = {
    total: list.items.length,
    verified: list.items.filter(i => i.status === 'verified').length,
    linked: list.items.filter(i => i.theory_links.length > 0).length,
    linkedByTheory,
  }
  return {
    list: {
      ...list,
      items: list.items.map(i => (i.id === firstLinked ? i : { ...i, theory_links: [], concept_tags: [] })),
    },
    preview,
  }
}
