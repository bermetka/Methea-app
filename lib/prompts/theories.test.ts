import { describe, it, expect, vi } from 'vitest'
import { suggestTheories } from './theories'
import type { BriefExtraction, ResearchContext, Theory } from '@/types/database'

// suggestTheories calls Claude via generateJSON — mock it so these tests exercise only the
// fit-check sanitization logic (the part responsible for the no-fit state never crashing),
// not the real API. vi.mock is hoisted above the imports above by vitest's transform.
const generateJSONMock = vi.fn()
vi.mock('@/lib/claude', () => ({
  generateJSON: (...args: unknown[]) => generateJSONMock(...args),
}))

const libraryTheories: Theory[] = [
  {
    id: 'lib-1',
    name: 'Technology Acceptance Model',
    author: 'Davis',
    year: 1989,
    summary: '',
    concepts: ['perceived usefulness'],
    disciplines: ['Information Systems'],
    doi: null,
    openalex_id: null,
    created_at: '',
  },
  {
    id: 'lib-2',
    name: 'Institutional Theory',
    author: 'DiMaggio & Powell',
    year: 1983,
    summary: '',
    concepts: ['isomorphism'],
    disciplines: ['Sociology'],
    doi: null,
    openalex_id: null,
    created_at: '',
  },
]

function makeCtx(brief: Partial<BriefExtraction>): ResearchContext {
  return {
    version: 1,
    outdated_blocks: [],
    brief: {
      topic: '',
      research_question: '',
      research_type: 'exploratory',
      constraints: [],
      degree_level: 'Masters',
      discipline: 'Other',
      ...brief,
    },
  }
}

// The brief from the bug report: a computational linguistics study with no social-science
// angle. This is the scenario the no-fit path exists for.
const kyrgyzNlpBrief: Partial<BriefExtraction> = {
  topic: 'Byte-pair encoding tokenization for Kyrgyz vowel harmony in NLP models',
  research_question: 'Does a BPE tokenizer that is aware of Kyrgyz vowel harmony improve subword segmentation accuracy over a standard BPE tokenizer?',
  research_type: 'exploratory',
  discipline: 'Computer Science',
}

describe('suggestTheories', () => {
  it('returns the 5 suggestions when the topic fits the library', async () => {
    generateJSONMock.mockResolvedValueOnce({
      fits: true,
      reason: 'This is an organisational-adoption question the library is built for.',
      theories: [
        { theory_id: 'lib-1', why_it_fits: 'Explains adoption.', fit_score: 5 },
        { theory_id: 'lib-2', why_it_fits: 'Explains diffusion.', fit_score: 4 },
      ],
      suggested_custom_theories: [],
    })

    const result = await suggestTheories(makeCtx({ topic: 'Enterprise software adoption' }), libraryTheories)

    expect(result.fits).toBe(true)
    expect(result.theories.map(t => t.theory_id)).toEqual(['lib-1', 'lib-2'])
    expect(result.suggested_custom_theories).toEqual([])
  })

  it('drops any suggested theory_id not present in the library (anti-hallucination guard)', async () => {
    generateJSONMock.mockResolvedValueOnce({
      fits: true,
      reason: 'Fits.',
      theories: [
        { theory_id: 'lib-1', why_it_fits: 'Real.', fit_score: 5 },
        { theory_id: 'made-up-id', why_it_fits: 'Hallucinated.', fit_score: 5 },
      ],
      suggested_custom_theories: [],
    })

    const result = await suggestTheories(makeCtx({ topic: 'Enterprise software adoption' }), libraryTheories)

    expect(result.theories.map(t => t.theory_id)).toEqual(['lib-1'])
  })

  // The acceptance test from the bug report: a Kyrgyz BPE-tokenizer / vowel-harmony NLP
  // brief must surface the no-fit state — never throw, never force 5 theories on a topic
  // the library has nothing for.
  it('returns a no-fit result for a computational NLP brief, without crashing', async () => {
    generateJSONMock.mockResolvedValueOnce({
      fits: false,
      reason: 'a computational NLP/tokenization study with no social-science dimension',
      theories: [],
      suggested_custom_theories: ['Byte Pair Encoding', 'Vowel Harmony Theory', 'Subword Segmentation Models'],
    })

    const result = await suggestTheories(makeCtx(kyrgyzNlpBrief), libraryTheories)

    expect(result.fits).toBe(false)
    expect(result.reason).toContain('NLP')
    expect(result.theories).toEqual([])
    expect(result.suggested_custom_theories).toEqual([
      'Byte Pair Encoding', 'Vowel Harmony Theory', 'Subword Segmentation Models',
    ])
  })

  it('caps suggested_custom_theories at 3 even if the model returns more', async () => {
    generateJSONMock.mockResolvedValueOnce({
      fits: false,
      reason: 'not a social-science topic',
      theories: [],
      suggested_custom_theories: ['A', 'B', 'C', 'D', 'E'],
    })

    const result = await suggestTheories(makeCtx(kyrgyzNlpBrief), libraryTheories)

    expect(result.suggested_custom_theories).toEqual(['A', 'B', 'C'])
  })

  it('ignores theories/custom-theory names on the wrong side of fits (model contradicts itself)', async () => {
    generateJSONMock.mockResolvedValueOnce({
      fits: false,
      reason: 'not a fit',
      theories: [{ theory_id: 'lib-1', why_it_fits: 'should be ignored', fit_score: 5 }],
      suggested_custom_theories: ['Should be ignored too'],
    })

    const noFitResult = await suggestTheories(makeCtx(kyrgyzNlpBrief), libraryTheories)
    expect(noFitResult.theories).toEqual([])

    generateJSONMock.mockResolvedValueOnce({
      fits: true,
      reason: 'fits',
      theories: [{ theory_id: 'lib-1', why_it_fits: 'ok', fit_score: 5 }],
      suggested_custom_theories: ['Should also be ignored'],
    })

    const fitResult = await suggestTheories(makeCtx({ topic: 'Enterprise software adoption' }), libraryTheories)
    expect(fitResult.suggested_custom_theories).toEqual([])
  })

  // Defensive parsing: a malformed/partial response (missing fields, wrong types, or a
  // completely different shape) must degrade to a safe empty state, not throw — this is
  // what keeps the theories page from crashing on an unexpected model response.
  it.each([
    {},
    { fits: 'true', theories: 'not-an-array', suggested_custom_theories: 'nope' },
    { fits: false, suggested_custom_theories: [null, 42, '', '  ', 'Real Name'] },
    null,
  ])('never throws on a malformed response: %j', async malformed => {
    generateJSONMock.mockResolvedValueOnce(malformed)

    const result = await suggestTheories(makeCtx(kyrgyzNlpBrief), libraryTheories)

    expect(result.fits).toBe(false)
    expect(result.theories).toEqual([])
    expect(Array.isArray(result.suggested_custom_theories)).toBe(true)
  })
})
