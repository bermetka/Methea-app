import { describe, it, expect } from 'vitest'
import { titlesMatch, authorsMatch, yearsMatch, reconstructAbstract, normalizeDoi, extractDoi } from './works'
import { quoteInText } from '@/lib/prompts/reading-list'

describe('titlesMatch', () => {
  it('matches the same title regardless of case and punctuation', () => {
    expect(titlesMatch('The iron cage revisited', 'The Iron Cage Revisited')).toBe(true)
  })
  it('matches a main title against a record with a subtitle', () => {
    expect(titlesMatch('The Iron Cage Revisited', 'The Iron Cage Revisited: Institutional Isomorphism and Collective Rationality')).toBe(true)
  })
  it('rejects a review or reply that only contains the title', () => {
    expect(titlesMatch('Orientalism', 'Orientalism Reconsidered')).toBe(false)
    expect(titlesMatch('The Construction of Social Reality', 'Reply to "The Role of Declarations in the Construction of Social Reality"')).toBe(false)
  })
  it('does not accept a very short title as a prefix of something else', () => {
    expect(titlesMatch('Power', 'Power, Institutions and Organizations')).toBe(false)
  })
})

describe('authorsMatch', () => {
  it('finds a surname among the record authors', () => {
    expect(authorsMatch(['DiMaggio, P. J.'], ['Paul J. DiMaggio', 'Walter W. Powell'])).toBe(true)
  })
  it('rejects a different author', () => {
    expect(authorsMatch(['Scott, W. R.'], ['Renate Mayntz'])).toBe(false)
  })
  it('passes when the student gave no author', () => {
    expect(authorsMatch([], ['Anyone'])).toBe(true)
  })
})

describe('yearsMatch / normalizeDoi / reconstructAbstract', () => {
  it('allows a small year slack', () => {
    expect(yearsMatch(1983, 1984)).toBe(true)
    expect(yearsMatch(1983, 2003)).toBe(false)
    expect(yearsMatch(null, 2003)).toBe(true)
  })
  it('normalizes DOI forms', () => {
    expect(normalizeDoi('https://doi.org/10.2307/2095101')).toBe('10.2307/2095101')
    expect(normalizeDoi('doi: 10.2307/2095101')).toBe('10.2307/2095101')
  })
  it('rebuilds an abstract from the inverted index', () => {
    expect(reconstructAbstract({ institutions: [1], Why: [0], converge: [2] })).toBe('Why institutions converge')
    expect(reconstructAbstract(null)).toBeNull()
  })
})

describe('quoteInText (anti-hallucination guard for concept tags)', () => {
  const abstract = 'Organizations adopt formal structures to gain legitimacy, often decoupled from practice.'
  it('accepts a verbatim quote', () => {
    expect(quoteInText('adopt formal structures to gain legitimacy', abstract)).toBe(true)
  })
  it('rejects a paraphrase', () => {
    expect(quoteInText('organizations seek legitimacy through structure', abstract)).toBe(false)
  })
  it('rejects one- or two-word quotes', () => {
    expect(quoteInText('legitimacy', abstract)).toBe(false)
  })
})

describe('extractDoi', () => {
  it('reads a DOI from doi.org and publisher links', () => {
    expect(extractDoi('https://doi.org/10.2307/2095101')).toBe('10.2307/2095101')
    expect(extractDoi('https://www.tandfonline.com/doi/full/10.1080/13645579.2016.1144401')).toBe('10.1080/13645579.2016.1144401')
    expect(extractDoi('https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1540-6520.2010.00427.x.')).toBe('10.1111/j.1540-6520.2010.00427.x')
  })
  it('returns null when there is no DOI', () => {
    expect(extractDoi('Giddens, A. (1984). The constitution of society.')).toBeNull()
  })
})
