// What an unpaid project sees in Reading (Gate 2) — paywall option 3 (2026-11-11):
// free: why the theory fits her question and its core idea. Paid, as the "full theory
// guide": how it developed, strengths and critiques, when to use it and common
// mistakes, and what to read each core work for. Unpaid pages get the counts, the
// first line of one critique as a teaser, and the titles of the core readings. One
// recent work per theory; the rest as a count. Her own list: the summary and one
// linked work; the per-work breakdown is paid. Applied on the server, so locked text
// never reaches the page.

import type { StudentReadingList, VerifiedWork } from '@/types/database'
import type { CardWork, TheoryCardContent } from '@/lib/literature/theory-content'

export const FREE_MUST_READS = 0
export const FREE_RECENT = 1
/** How much of the first critique an unpaid page shows before the blur. */
export const TEASER_CHARS = 90

/** What the locked full guide holds, for the counts on the unpaid card. */
export interface LockedGuide {
  development: number
  strands: number
  strengths: number
  critiques: number
  whenToUse: number
  mistakes: number
  /** The start of the first critique, cut mid-sentence: the rest is behind the unlock. */
  teaser: string | null
}

export function teaserOf(text: string | undefined, max = TEASER_CHARS): string | null {
  if (!text) return null
  if (text.length <= max) return text.slice(0, Math.max(0, Math.floor(text.length * 0.6)))
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return space > 40 ? cut.slice(0, space) : cut
}

export interface ListPreview {
  total: number
  verified: number
  linked: number
  /** theory id → how many of her works link to it */
  linkedByTheory: Record<string, number>
}

/** A theory's reading for an unpaid project: free part + the titles/counts of what is locked. */
export function gateTheoryReading(
  card: TheoryCardContent | null,
  recent: VerifiedWork[],
  paid: boolean
): {
  card: TheoryCardContent | null
  recent: VerifiedWork[]
  lockedReads: CardWork[]
  lockedRecent: number
  lockedGuide: LockedGuide | null
} {
  if (paid) return { card, recent, lockedReads: [], lockedRecent: 0, lockedGuide: null }
  const reads = card?.must_read ?? []
  return {
    card: card
      ? {
          ...card,
          must_read: reads.slice(0, FREE_MUST_READS),
          development: [],
          strands: [],
          strengths: [],
          critiques: [],
          when_to_use: [],
          common_mistakes: [],
        }
      : null,
    recent: recent.slice(0, FREE_RECENT),
    lockedReads: reads.slice(FREE_MUST_READS).map(m => m.work),
    lockedRecent: Math.max(0, recent.length - FREE_RECENT),
    lockedGuide: card
      ? {
          development: card.development.length,
          strands: card.strands.length,
          strengths: card.strengths.length,
          critiques: card.critiques.length,
          whenToUse: card.when_to_use.length,
          mistakes: card.common_mistakes.length,
          teaser: teaserOf(card.critiques[0]?.point),
        }
      : null,
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
