import { generateJSON } from '@/lib/claude'
import type { ResearchContext, Theory, TheorySuggestion } from '@/types/database'

const SYSTEM = `You are a research methodology assistant helping Masters and PhD students build their theoretical framework.
Given a student's research brief and a list of available theories, suggest the 5 most relevant theories.
You MUST only suggest theories from the provided list — never invent a theory, author, or citation.
For each suggestion, explain in plain language why it fits this specific research question.
Respond with a single valid JSON array — no markdown, no explanation, just the JSON.`

export async function suggestTheories(
  ctx: ResearchContext,
  allTheories: Theory[]
): Promise<TheorySuggestion[]> {
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

Available theory library (you MUST only suggest IDs from this list):
${libraryListing}

Return a JSON array of exactly 5 objects, sorted by fit (best fit first):
[
  {
    "theory_id": "<exact UUID from the library above>",
    "why_it_fits": "<1-2 sentences explaining why this theory fits THIS specific research question — be concrete, not generic>",
    "fit_score": <integer 1-5, where 5 = strongest fit>
  }
]

Rules:
- theory_id must be an exact ID from the library list above — never invent one
- why_it_fits must reference the student's actual topic, not generic praise
- Vary disciplines if possible — don't suggest 5 theories from the same field
- fit_score 5 = theory is central to this type of research; 1 = tangentially relevant`

  const suggestions = await generateJSON<TheorySuggestion[]>(SYSTEM, userPrompt, 1024)

  // Safety filter: remove any suggestion whose ID isn't in our library
  const validIds = new Set(allTheories.map(t => t.id))
  return suggestions.filter(s => validIds.has(s.theory_id))
}
