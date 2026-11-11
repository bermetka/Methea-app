import { generateJSON } from '@/lib/claude'
import { formatGate1Answers } from '@/lib/gate1-answers'
import type { BriefExtraction, ClarificationQuestion, Gate1Answer, RefinedQuestion } from '@/types/database'

const SYSTEM = `You are a research methodology assistant helping Masters and PhD students sharpen their research question.
You rewrite the student's OWN question using their answers to three clarifying questions. You never change the topic, never add a theory, author or citation, and never write anything they would submit as their own prose beyond the one question.
Respond with a single valid JSON object — no markdown, no explanation, just the JSON.`

/** The Gate 1 inputs the refined question is made from — when this changes, the question is made again. */
export function refineSource(
  responses: Record<string, Gate1Answer> | undefined,
  contextNote: string | undefined
): string {
  const ordered = Object.keys(responses ?? {}).sort().map(k => [k, responses![k]])
  return JSON.stringify({ a: ordered, n: (contextNote ?? '').trim() })
}

export async function refineQuestion(
  brief: BriefExtraction,
  questions: ClarificationQuestion[] | undefined,
  responses: Record<string, Gate1Answer> | undefined,
  contextNote: string | undefined
): Promise<RefinedQuestion> {
  const userPrompt = `Student's brief:
Topic: ${brief.topic}
Their research question: ${brief.research_question}
Research type: ${brief.research_type}
Discipline: ${brief.discipline}
Degree level: ${brief.degree_level}
${brief.constraints?.length ? `Constraints from the brief: ${brief.constraints.join('; ')}` : ''}

Their answers to the clarifying questions:
${formatGate1Answers(questions, responses) || '(none)'}
${contextNote?.trim() ? `\nTheir added context: ${contextNote.trim()}` : ''}

Rewrite their research question so it is researchable: one group they can describe in a sentence, a place or setting they can actually reach (from their access answers), and one idea a theory can attach to. Keep their topic and their words where you can.

Return this exact JSON shape:
{
  "refined_question": "one question, one sentence, ending with a question mark, under 30 words",
  "changes": ["2-3 short lines (under 14 words each) on what got narrower and why, each starting with what is now fixed, e.g. 'A group you can reach: women already running a business'"]
}`

  const raw = await generateJSON<{ refined_question?: unknown; changes?: unknown }>(SYSTEM, userPrompt, 400)
  return parseRefined(raw, refineSource(responses, contextNote))
}

/** Defensive: a malformed reply becomes an error, never a half-filled screen. */
export function parseRefined(
  raw: { refined_question?: unknown; changes?: unknown } | null | undefined,
  source: string
): RefinedQuestion {
  const question = typeof raw?.refined_question === 'string' ? raw.refined_question.trim().slice(0, 400) : ''
  if (!question) throw new Error('Refined question missing in model reply')
  const changes = Array.isArray(raw?.changes)
    ? raw!.changes.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map(c => c.trim().slice(0, 160)).slice(0, 3)
    : []
  return { question, changes, source }
}
