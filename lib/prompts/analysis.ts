import { generateJSON } from '@/lib/claude'
import type { CodedSegment, AnalysisTheme } from '@/types/database'

interface ConceptRef {
  concept: string
  theory_id: string
  theory_name: string
}

interface CodingResult {
  coded_segments: CodedSegment[]
  themes: AnalysisTheme[]
}

const SYSTEM = `You are a qualitative research coding assistant. Your job is to:
1. Identify verbatim quotes from the transcript that map to the given theoretical framework concepts (deductive coding).
2. Flag emergent themes not covered by the framework (inductive coding).
3. Synthesise quotes into themes.

Rules:
- Quotes must be verbatim excerpts from the transcript. Never paraphrase.
- Each quote must be 1-4 sentences maximum.
- Map each segment to the single most relevant concept.
- Produce 3-6 themes. Each theme needs at minimum 2 supporting quotes.
- Theme labels: 3-6 words, noun phrase, no verbs like "shows" or "demonstrates".
- Summaries must synthesise evidence — never just restate the theme label.
- Do not write discussion, conclusions, or interpretations. Surface patterns only.

Return ONLY valid JSON matching this exact structure:
{
  "coded_segments": [
    {
      "quote": "verbatim text",
      "concept": "concept name",
      "theory_id": "theory_id string",
      "code_type": "deductive",
      "inductive_label": null
    }
  ],
  "themes": [
    {
      "id": "t1",
      "label": "Short Theme Label",
      "summary": "1-2 sentence synthesis of what the evidence shows.",
      "concepts": ["concept1", "concept2"],
      "quotes": [ /* same structure as coded_segments above, subset */ ],
      "frequency": 3,
      "confirmed": false
    }
  ]
}`

export async function codeTranscript(
  transcriptText: string,
  concepts: ConceptRef[],
  researchQuestion: string
): Promise<CodingResult> {
  const conceptList = concepts
    .map(c => `- ${c.concept} (${c.theory_name}, id: ${c.theory_id})`)
    .join('\n')

  const prompt = `Research question: "${researchQuestion}"

Framework concepts to code against:
${conceptList}

Transcript:
"""
${transcriptText.slice(0, 12000)}
"""

Code this transcript against the framework concepts and synthesise themes. Return JSON only.`

  return generateJSON<CodingResult>(SYSTEM, prompt, 3000)
}
