import { generateJSON } from '@/lib/claude'
import type { ResearchContext, Theory, FrameworkEdge, FrameworkCitation } from '@/types/database'

// ── Relationship labels ──────────────────────────────────────────────────────

const EDGE_SYSTEM = `You are a research methodology expert helping a student map the relationships between their theoretical framework components.
Given a set of theories and the student's research context, identify how each pair of theories relates.
Use short verb phrases (3-5 words max) that a Masters student would recognise: "shapes", "moderates", "extends", "complements", "challenges", "operationalises", "provides mechanism for".
Respond with a single valid JSON array only — no markdown, no explanation.`

export async function generateRelationshipLabels(
  ctx: ResearchContext,
  theories: Theory[]
): Promise<FrameworkEdge[]> {
  if (theories.length < 2) return []

  const pairs: string[] = []
  for (let i = 0; i < theories.length; i++) {
    for (let j = i + 1; j < theories.length; j++) {
      pairs.push(`"${theories[i].name}" (${theories[i].id}) ↔ "${theories[j].name}" (${theories[j].id})`)
    }
  }

  const userPrompt = `Student research context:
Topic: ${ctx.brief!.topic}
Research question: ${ctx.brief!.research_question}
Research type: ${ctx.brief!.research_type}

Theory pairs to label:
${pairs.join('\n')}

Return a JSON array — one object per directional relationship (choose the most meaningful direction):
[
  {
    "from": "<theory id of the influencing theory>",
    "to": "<theory id of the influenced theory>",
    "label": "<short verb phrase describing the relationship>"
  }
]

Rules:
- Every theory must appear in at least one relationship
- Use exact theory IDs from the input — never invent IDs
- Keep labels under 5 words
- Prefer directional (from→to) over bidirectional where one direction is dominant`

  const raw = await generateJSON<FrameworkEdge[]>(EDGE_SYSTEM, userPrompt, 512)

  const validIds = new Set(theories.map(t => t.id))
  return raw.filter(e => validIds.has(e.from) && validIds.has(e.to))
}

// ── Framework narrative ──────────────────────────────────────────────────────

const NARRATIVE_SYSTEM = `You are a research methodology expert helping a student write the theoretical framework section of their research proposal.
Write a single cohesive paragraph (150-200 words) that explains how the selected theories together form a framework for the student's specific research question.
The paragraph must name each theory, cite it with (Author, Year), and explain what role each plays.
Do not write a conclusion or interpretation — only the framework structure.
At the end, return a separate citations array with structured metadata for each (Author, Year) citation you used.
Respond with a single valid JSON object only.`

export async function generateFrameworkNarrative(
  ctx: ResearchContext,
  theories: Theory[],
  edges: FrameworkEdge[]
): Promise<{ narrative: string; citations: FrameworkCitation[] }> {
  const theoryList = theories.map(t =>
    `- ${t.name} (${t.author}, ${t.year ?? 'n/d'})${t.doi ? ` DOI: ${t.doi}` : ''}`
  ).join('\n')

  const edgeList = edges.map(e => {
    const from = theories.find(t => t.id === e.from)?.name ?? e.from
    const to   = theories.find(t => t.id === e.to)?.name ?? e.to
    return `${from} → ${e.label} → ${to}`
  }).join('\n')

  const userPrompt = `Student research context:
Topic: ${ctx.brief!.topic}
Research question: ${ctx.brief!.research_question}
Discipline: ${ctx.brief!.discipline}

Selected theories:
${theoryList}

Identified relationships:
${edgeList}

Return a JSON object:
{
  "narrative": "<150-200 word paragraph integrating all theories with (Author, Year) citations>",
  "citations": [
    {
      "author": "<surname of first author>",
      "year": <year as integer>,
      "title": "<full theory / work title>",
      "doi": "<DOI if known from the theory list above, else omit>"
    }
  ]
}

Rules:
- The narrative must reference every theory by name and cite it
- Citations array must include one entry per (Author, Year) pair used in the narrative
- DOI in citations: only include if it was provided in the theory list above — never invent one
- The narrative must not interpret findings or draw conclusions — only describe the framework structure`

  return await generateJSON<{ narrative: string; citations: FrameworkCitation[] }>(
    NARRATIVE_SYSTEM, userPrompt, 1024
  )
}
