import { describe, expect, it } from 'vitest'
import { gateStudentList, gateTheoryReading, teaserOf } from './reading-gate'
import type { StudentListItem, StudentReadingList, VerifiedWork } from '@/types/database'
import type { TheoryCardContent } from '@/lib/literature/theory-content'

const work = (title: string) => ({ authors: ['A, B'], year: 2000, title, doi: null, openalex_id: null, oa_url: null })
const card = {
  library_name: 'Social exchange theory',
  must_read: ['One', 'Two', 'Three', 'Four'].map(t => ({ role: 'core', work: work(t), chapter: null, why_read: `why ${t}`, reading_question: `q ${t}` })),
  development: [{ kind: 'foundation', work: work('Dev'), adds: 'adds secret' }],
  strands: [],
  strengths: [{ point: 'strength secret', source: work('S') }, { point: 'strength two', source: work('S2') }],
  critiques: [{ point: 'Better at explaining sameness than change. If actors are shaped by institutions, how do they change them? Secret tail.', source: work('C') }],
  when_to_use: ['use secret'],
  common_mistakes: ['mistake secret', 'mistake two'],
} as unknown as TheoryCardContent
const recent = ['R1', 'R2', 'R3'].map(work) as unknown as VerifiedWork[]

describe('gateTheoryReading', () => {
  it('paid: everything', () => {
    const g = gateTheoryReading(card, recent, true)
    expect(g.card!.must_read).toHaveLength(4)
    expect(g.card!.critiques).toHaveLength(1)
    expect(g.recent).toHaveLength(3)
    expect(g.lockedReads).toEqual([])
    expect(g.lockedGuide).toBeNull()
  })
  it('unpaid: core idea stays; the full guide is counts + a teaser; readings as titles only', () => {
    const g = gateTheoryReading(card, recent, false)
    expect(g.card!.must_read).toEqual([])
    expect(g.lockedReads.map(w => w.title)).toEqual(['One', 'Two', 'Three', 'Four'])
    expect(g.lockedGuide).toMatchObject({ development: 1, strengths: 2, critiques: 1, whenToUse: 1, mistakes: 2 })
    expect(g.lockedGuide!.teaser!.startsWith('Better at explaining sameness')).toBe(true)
    const json = JSON.stringify(g)
    for (const secret of ['why Three', 'q Four', 'adds secret', 'strength secret', 'use secret', 'mistake secret', 'Secret tail']) {
      expect(json).not.toContain(secret)
    }
    expect(g.recent).toHaveLength(1)
    expect(g.lockedRecent).toBe(2)
  })
  it('no card: nothing breaks', () => {
    expect(gateTheoryReading(null, [], false)).toEqual({ card: null, recent: [], lockedReads: [], lockedRecent: 0, lockedGuide: null })
  })
})

describe('teaserOf', () => {
  it('cuts long text at a word, keeps short text partial', () => {
    expect(teaserOf('a'.repeat(30) + ' ' + 'b'.repeat(100))!.length).toBeLessThanOrEqual(90)
    expect(teaserOf('Short critique.')!.length).toBeLessThan('Short critique.'.length)
    expect(teaserOf(undefined)).toBeNull()
  })
})

describe('gateStudentList', () => {
  const item = (id: string, theories: string[]): StudentListItem => ({
    id, raw: id, parsed: { authors: [], year: null, title: id, doi: null }, status: 'verified', work: null,
    theory_links: theories.map(t => ({ theory_id: t, evidence: 'cites' })), concept_tags: [{ concept: 'trust', quote: 'x' }],
    abstract_available: true,
  })
  const list: StudentReadingList = { items: [item('a', []), item('b', ['t1']), item('c', ['t1', 't2'])], checked_for: 't1,t2', checked_at: 'now' }

  it('paid: untouched, no preview', () => {
    expect(gateStudentList(list, true)).toEqual({ list, preview: null })
  })
  it('unpaid: counts for the summary; analysis only on the first linked work', () => {
    const { list: g, preview } = gateStudentList(list, false)
    expect(preview).toEqual({ total: 3, verified: 3, linked: 2, linkedByTheory: { t1: 2, t2: 1 } })
    expect(g!.items.find(i => i.id === 'b')!.theory_links).toHaveLength(1)
    expect(g!.items.find(i => i.id === 'c')!.theory_links).toEqual([])
    expect(g!.items.find(i => i.id === 'c')!.concept_tags).toEqual([])
    expect(g!.items.map(i => i.raw)).toEqual(['a', 'b', 'c'])
  })
  it('no list: nothing to gate', () => {
    expect(gateStudentList(null, false)).toEqual({ list: null, preview: null })
  })
})
