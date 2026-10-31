import { generateJSON, FAST_MODEL } from '@/lib/claude'
import { extractDoi } from '@/lib/literature/works'

export const READING_LIST_LIMIT = 40

export interface ParsedRef {
  raw: string
  authors: string[]
  year: number | null
  title: string | null
  doi: string | null
}

const PARSE_SYSTEM = `You split a student's pasted reading list into separate references and copy out their parts.
Rules:
- Extract ONLY what is written. Never add, complete, correct or guess authors, years, titles or DOIs.
- If a part is missing, use null (or [] for authors).
- "raw" is the reference exactly as the student wrote it.
- authors: surnames with initials as written, e.g. "DiMaggio, P. J.".
- title: the title of the work itself (not the journal or book it appeared in).
- Skip lines that are not references (headings, notes, empty lines).
Respond with JSON only: {"items":[{"raw":"","authors":[],"year":null,"title":null,"doi":null}]}`

/** Fast model, extraction only. The student's text is the single source of truth. */
export async function parseReadingList(text: string): Promise<{ items: ParsedRef[]; truncated: boolean }> {
  const res = await generateJSON<{ items: ParsedRef[] }>(
    PARSE_SYSTEM,
    `Reading list:\n"""\n${text.slice(0, 20000)}\n"""`,
    4096,
    { model: FAST_MODEL }
  )
  const items = (Array.isArray(res?.items) ? res.items : [])
    .filter(i => typeof i?.raw === 'string' && i.raw.trim())
    .map(i => ({
      raw: i.raw.trim(),
      authors: Array.isArray(i.authors) ? i.authors.filter(a => typeof a === 'string') : [],
      year: typeof i.year === 'number' ? i.year : null,
      title: typeof i.title === 'string' && i.title.trim() ? i.title.trim() : null,
      doi: typeof i.doi === 'string' && i.doi.trim() ? i.doi.trim() : null,
    }))
    // Anti-invention guard: a title or DOI that isn't in the student's text is dropped.
    .map(i => ({
      ...i,
      title: i.title && text.toLowerCase().includes(i.title.toLowerCase().slice(0, 25)) ? i.title : null,
      doi: i.doi && text.toLowerCase().includes(i.doi.toLowerCase()) ? i.doi : null,
    }))
    // A DOI inside a link (doi.org or a publisher URL) counts even if the model missed it.
    .map(i => ({ ...i, doi: i.doi ?? extractDoi(i.raw) }))
  return { items: items.slice(0, READING_LIST_LIMIT), truncated: items.length > READING_LIST_LIMIT }
}

const TERMS_SYSTEM = `You pick 2–4 short search terms (1–3 words each, English) that name the TOPIC of a student's research — the setting and phenomenon, not the theory or method.
Example: question "How do Kyrgyz universities adopt quality assurance reforms?" → ["quality assurance","higher education","Kyrgyzstan"].
Respond with JSON only: {"terms":[]}`

export async function topicTerms(topic: string, question: string): Promise<string[]> {
  try {
    const res = await generateJSON<{ terms: string[] }>(
      TERMS_SYSTEM,
      `Topic: ${topic}\nResearch question: ${question}`,
      200,
      { model: FAST_MODEL }
    )
    return (res?.terms ?? []).filter(t => typeof t === 'string' && t.trim()).map(t => t.trim()).slice(0, 4)
  } catch {
    return []
  }
}

export interface TagInput { key: string; title: string; abstract: string }

const TAG_SYSTEM = `You help a graduate student see how works on her reading list connect to her research. You do NOT summarize works, judge their quality, or say what she should conclude.
For each work you get its title and abstract. Tag which of the student's concepts the ABSTRACT explicitly speaks to.
Rules:
- Only use concepts from the given list, spelled exactly as given.
- For every tag, give "quote": a short phrase (4–20 words) copied VERBATIM from the abstract that shows the link.
- If the abstract does not clearly speak to any concept, return an empty list for that work. Do not stretch.
- At most 3 tags per work.
Respond with JSON only: {"works":[{"key":"","tags":[{"concept":"","quote":""}]}]}`

/** Abstract-based concept tags. Every quote is checked against the abstract before use. */
export async function tagConcepts(
  works: TagInput[],
  concepts: string[],
  question: string
): Promise<Record<string, { concept: string; quote: string }[]>> {
  if (!works.length || !concepts.length) return {}
  const list = works
    .map(w => `KEY: ${w.key}\nTITLE: ${w.title}\nABSTRACT: ${w.abstract.slice(0, 2500)}`)
    .join('\n\n---\n\n')
  const res = await generateJSON<{ works: { key: string; tags: { concept: string; quote: string }[] }[] }>(
    TAG_SYSTEM,
    `Student's research question: ${question}\nStudent's concepts: ${JSON.stringify(concepts)}\n\nWorks:\n\n${list}`,
    4096
  )
  const byKey = new Map(works.map(w => [w.key, w]))
  const allowed = new Set(concepts)
  const out: Record<string, { concept: string; quote: string }[]> = {}
  for (const w of res?.works ?? []) {
    const src = byKey.get(w.key)
    if (!src) continue
    out[w.key] = (w.tags ?? [])
      .filter(t => allowed.has(t.concept) && typeof t.quote === 'string' && quoteInText(t.quote, src.abstract))
      .slice(0, 3)
  }
  return out
}

/** The quote must appear in the abstract (whitespace- and case-insensitive). */
export function quoteInText(quote: string, text: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[“”"'‘’]/g, '').replace(/\s+/g, ' ').trim()
  const q = n(quote)
  return q.split(' ').length >= 3 && n(text).includes(q)
}
