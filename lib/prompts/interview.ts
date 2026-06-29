import { generateJSON } from '@/lib/claude'
import type { ResearchContext, Theory, InterviewQuestion } from '@/types/database'

const SYSTEM = `You are a research methodology expert helping a Masters or PhD student design an interview guide.
Generate 10–15 semi-structured interview questions grounded in the student's theoretical framework.
Each question must be open-ended, jargon-free, and directly linked to a concept from one of the selected theories.

You MUST respond with a single flat JSON object using EXACTLY this structure — no other keys:
{
  "questions": [
    {
      "id": "q1",
      "question": "full interview question text",
      "concept": "specific concept this question explores",
      "theory_id": "exact theory id from the list provided"
    }
  ]
}

Rules:
- 10–15 questions total
- Each theory must appear at least once
- Questions must feel natural to ask in a real interview — no academic jargon
- "concept" is 2–4 words naming the theoretical concept (e.g. "resource dependency", "sensemaking", "effectuation logic")
- "theory_id" must be one of the exact IDs provided — never invent a new one`

export async function generateInterviewGuide(
  ctx: ResearchContext,
  theories: Theory[]
): Promise<InterviewQuestion[]> {
  const brief = ctx.brief!
  const theoryList = theories.map(t => `id="${t.id}" name="${t.name}" concepts: ${t.concepts.join(', ')}`).join('\n')

  const prompt = `Research context:
- Topic: ${brief.topic}
- Research question: ${brief.research_question}
- Degree level: ${brief.degree_level}
- Discipline: ${brief.discipline}
- Methodology: ${ctx.methodology?.methodology ?? 'qualitative'}
- Data collection: ${ctx.methodology?.data_collection ?? 'interviews'}

Selected theories:
${theoryList}

Generate the interview guide questions.`

  const result = await generateJSON<{ questions: InterviewQuestion[] }>(SYSTEM, prompt, 2048)
  // Safety filter: only keep questions with valid theory_ids
  const validIds = new Set(theories.map(t => t.id))
  return result.questions.filter(q => validIds.has(q.theory_id))
}
