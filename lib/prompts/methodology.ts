import { generateJSON } from '@/lib/claude'
import type { ResearchContext, Theory } from '@/types/database'

export interface MethodologyChain {
  paradigm: string
  paradigm_why: string
  methodology: string
  methodology_why: string
  data_collection: string
  data_collection_why: string
  sample: string
  sample_why: string
  analysis_method: string
  analysis_method_why: string
  narrative: string
}

const SYSTEM = `You are a research methodology expert guiding a Masters or PhD student.
Given the student's research context (topic, question, theories, framework), derive the most appropriate methodology chain.
Each "why" explanation must be 1–2 sentences, co-constructive in tone, anchored to the student's specific framework and topic.
Never invent theories or citations.
For analysis_method: when the student has a theoretical framework and the approach is deductive coding against it, use "Codebook thematic analysis" — not "thematic analysis" alone. Reserve "reflexive thematic analysis" only for inductive, framework-free studies.

You MUST respond with a single flat JSON object using EXACTLY these keys — no nesting, no arrays, no other keys:
{
  "paradigm": "short label",
  "paradigm_why": "1-2 sentence explanation",
  "methodology": "short label",
  "methodology_why": "1-2 sentence explanation",
  "data_collection": "short label",
  "data_collection_why": "1-2 sentence explanation",
  "sample": "short label",
  "sample_why": "1-2 sentence explanation",
  "analysis_method": "short label",
  "analysis_method_why": "1-2 sentence explanation",
  "narrative": "120-160 word methods paragraph"
}`

export async function generateMethodologyChain(
  ctx: ResearchContext,
  theories: Theory[]
): Promise<MethodologyChain> {
  const brief = ctx.brief!
  const theoryList = theories.map(t => `${t.name} (${t.author}, ${t.year})`).join(', ')
  const edges = ctx.framework?.edges?.map(e => `${e.from} → ${e.to}: ${e.label}`).join('; ') ?? 'none'

  const prompt = `Research context:
- Topic: ${brief.topic}
- Research question: ${brief.research_question}
- Degree level: ${brief.degree_level}
- Discipline: ${brief.discipline}
- Selected theories: ${theoryList}
- Framework relationships: ${edges}

Derive the methodology chain. Each field must be a short label (2–5 words). Each "why" must be 1–2 sentences directly referencing the student's framework/theories.

The narrative field is a 120–160 word paragraph suitable for a methods section, weaving together all five choices with their justification.`

  return generateJSON<MethodologyChain>(SYSTEM, prompt, 1500)
}
