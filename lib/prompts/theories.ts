import { generateJSON } from '@/lib/claude'
import type { ResearchContext, Theory, TheoryFitResult } from '@/types/database'

const MAX_CUSTOM_SUGGESTIONS = 3

const SYSTEM = `You are a research methodology assistant helping Masters and PhD students build their theoretical framework.
Methea's theory library is curated for social-science research (e.g. psychology, sociology, business, education, health sciences, political science, information systems, law). It is NOT a fit for purely computational, engineering, or technical research that has no social, behavioural, or organisational dimension.

Given a student's research brief and a list of available theories, first decide whether the library is a good fit for this topic:
- If it IS a good fit, set "fits" to true, "reason" to a one-sentence confirmation, "suggested_custom_theories" to an empty array, and suggest the 5 most relevant theories in "theories".
- If it is NOT a good fit (e.g. the topic is a computational/technical study — algorithms, model architecture, tokenization, signal processing — with no social-science angle), set "fits" to false, "theories" to an empty array, write a one-sentence "reason" naming what kind of research this actually is, and suggest 0-3 theory or framework NAMES actually used in that field in "suggested_custom_theories".

Rules:
- You MUST only suggest theories from the provided list in "theories" — never invent a theory, author, or citation.
- "suggested_custom_theories" entries must be bare names only — never an author, year, or citation, since you cannot verify those from training data.
- For each suggestion in "theories", explain in plain language why it fits this specific research question.
Respond with a single valid JSON object — no markdown, no explanation, just the JSON.`

export async function suggestTheories(
  ctx: ResearchContext,
  allTheories: Theory[]
): Promise<TheoryFitResult> {
  const brief = ctx.brief!
  const gate1 = ctx.socratic_gate_1

  const libraryListing = allTheories.map(t =>
    `ID: ${t.id} | Name: ${t.name} | Author: ${t.author} (${t.year ?? 'n/d'}) | Disciplines: ${t.disciplines.join(', ')} | Concepts: ${t.concepts.slice(0, 4).join(', ')}`
  ).join('\n')

  const userPrompt = `Student's research context:
Topic: ${brief.topic}
Research question: ${brief.research_question}
Research type: ${brief.research_type}
Discipline: ${brief.discipline}
Degree level: ${brief.degree_level}
${brief.constraints?.length ? `Constraints: ${brief.constraints.join('; ')}` : ''}
${gate1?.responses ? `Clarification answers: ${JSON.stringify(gate1.responses)}` : ''}
${gate1?.context_note ? `Student's added context (weight this nuance in your reasoning): ${gate1.context_note}` : ''}

The theory library is in the system prompt (you MUST only suggest IDs from it).

Return a single JSON object:
{
  "fits": <true|false>,
  "reason": "<one sentence — if fits is false, name what kind of research this actually is>",
  "theories": [
    {
      "theory_id": "<exact UUID from the theory library>",
      "why_it_fits": "<1-2 sentences explaining why this theory fits THIS specific research question — be concrete, not generic>",
      "fit_score": <integer 1-5, where 5 = strongest fit>
    }
  ],
  "suggested_custom_theories": ["<bare theory/framework name>", ...]
}

Rules:
- When fits is true: "theories" has exactly 5 objects sorted by fit (best fit first), sorted by fit_score descending, and "suggested_custom_theories" is [].
- When fits is false: "theories" is [], and "suggested_custom_theories" has 0-3 names (no authors, years, or citations).
- theory_id must be an exact ID from the theory library — never invent one
- why_it_fits must reference the student's actual topic, not generic praise
- Vary disciplines if possible — don't suggest 5 theories from the same field
- fit_score 5 = theory is central to this type of research; 1 = tangentially relevant`

  // The library is the same for every student: send it as a cached system block.
  const cachedContext = `Available theory library (you MUST only suggest IDs from this list):\n${libraryListing}`
  const raw = await generateJSON<Partial<TheoryFitResult>>(SYSTEM, userPrompt, 1024, { cachedContext })

  // Defensive parsing throughout: a malformed or partial response from the model must
  // degrade to a safe empty state, never throw and crash the theories page.
  const fits = raw?.fits === true

  const validIds = new Set(allTheories.map(t => t.id))
  const theories = fits && Array.isArray(raw?.theories)
    ? raw.theories.filter(s => s && typeof s.theory_id === 'string' && validIds.has(s.theory_id))
    : []

  const suggestedCustomTheories = !fits && Array.isArray(raw?.suggested_custom_theories)
    ? raw.suggested_custom_theories
        .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        .map(n => n.trim())
        .slice(0, MAX_CUSTOM_SUGGESTIONS)
    : []

  return {
    fits,
    reason: typeof raw?.reason === 'string' ? raw.reason.trim() : '',
    theories,
    suggested_custom_theories: suggestedCustomTheories,
  }
}
