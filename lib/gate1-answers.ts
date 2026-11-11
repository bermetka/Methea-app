import type { ClarificationQuestion, Gate1Answer } from '@/types/database'

/**
 * Gate 1 answers are an option value per question, or several values for a
 * multi question (q3, access). Old projects only have strings. Everything that
 * reads the answers goes through these helpers so both shapes work.
 */

/** The answer as a list of values (empty when missing). */
export function answerValues(answer: Gate1Answer | undefined | null): string[] {
  if (Array.isArray(answer)) return answer.filter(v => typeof v === 'string' && v.length > 0)
  return typeof answer === 'string' && answer.length > 0 ? [answer] : []
}

export function isAnswered(answer: Gate1Answer | undefined | null): boolean {
  return answerValues(answer).length > 0
}

/** Option titles for display, joined; falls back to the raw value, '—' when unanswered. */
export function answerText(question: ClarificationQuestion | undefined, answer: Gate1Answer | undefined | null): string {
  const values = answerValues(answer)
  if (!values.length) return '—'
  return values
    .map(v => question?.options.find(o => o.value === v)?.title ?? v)
    .join('; ')
}

/** Questions and answers as plain lines for prompts ("Q: … — A: …"). */
export function formatGate1Answers(
  questions: ClarificationQuestion[] | undefined,
  responses: Record<string, Gate1Answer> | undefined
): string {
  if (!responses) return ''
  const qs = questions ?? []
  const ids = qs.length ? qs.map(q => q.id) : Object.keys(responses)
  return ids
    .filter(id => isAnswered(responses[id]))
    .map(id => {
      const q = qs.find(x => x.id === id)
      return `- ${q?.prompt ?? id} — ${answerText(q, responses[id])}`
    })
    .join('\n')
}
