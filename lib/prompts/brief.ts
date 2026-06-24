import { generateJSON } from '@/lib/claude'
import type { BriefExtraction, ClarificationQuestion } from '@/types/database'

const EXTRACT_BRIEF_SYSTEM = `You are a research methodology assistant helping Masters and PhD students structure their research.
Given a student's topic description and context, extract a structured research brief.
Respond with a single valid JSON object — no markdown, no explanation, just the JSON.`

export async function extractBrief(
  topic: string,
  degreeLevel: string,
  discipline: string,
  readingList?: string,
  fileText?: string
): Promise<BriefExtraction> {
  const contextParts = [
    `Topic description: ${topic}`,
    `Degree level: ${degreeLevel}`,
    `Discipline: ${discipline}`,
    readingList ? `Reading list (optional): ${readingList}` : null,
    fileText ? `Assignment brief / TOR text (optional): ${fileText}` : null,
  ].filter(Boolean).join('\n\n')

  const userPrompt = `${contextParts}

Extract a structured research brief. Return this exact JSON shape:
{
  "topic": "short phrase (5-10 words) naming the research subject",
  "research_question": "one clear research question implied by the topic, phrased as a question",
  "research_type": "exploratory" | "explanatory" | "descriptive",
  "constraints": ["list of implicit constraints from the brief — e.g. geography, time period, population, access"],
  "degree_level": "${degreeLevel}",
  "discipline": "${discipline}"
}

Research type guide:
- exploratory: seeks to understand a phenomenon ("how/why do X happen?")
- explanatory: tests causal relationships ("does X cause Y?")
- descriptive: maps the extent or distribution of something ("how widespread is X?")

Be concise. The research_question should be one sentence. constraints may be empty [] if none are apparent.`

  return generateJSON<BriefExtraction>(EXTRACT_BRIEF_SYSTEM, userPrompt, 512)
}

const GATE1_SYSTEM = `You are a research methodology assistant. Your job is to ask 4 targeted clarifying questions that help sharpen a student's research question and confirm the right methodology direction.
Generate questions that are specific to their topic — never generic.
Each question has exactly 3 options. Options must be clearly distinct.
Respond with a single valid JSON array — no markdown, no explanation, just the JSON.`

export async function generateSocraticQuestions(
  brief: BriefExtraction
): Promise<ClarificationQuestion[]> {
  const userPrompt = `Research brief:
Topic: ${brief.topic}
Research question: ${brief.research_question}
Research type: ${brief.research_type}
Discipline: ${brief.discipline}
Degree level: ${brief.degree_level}

Generate exactly 4 clarifying questions to sharpen this research question. The questions should address:
1. Whether the focus is understanding WHY vs. measuring HOW MUCH (methodology direction)
2. The scope — who/what is being studied and at what scale
3. The student's access to data/participants
4. Any key assumption in the research question worth surfacing

Return a JSON array with exactly 4 items, each matching this shape:
[
  {
    "id": "q1",
    "prompt": "the question itself — specific to their topic, not generic",
    "options": [
      { "value": "option_value_snake_case", "title": "Short title (3-5 words)", "description": "One sentence explaining what this means for their research" },
      { "value": "option_value_snake_case", "title": "Short title", "description": "One sentence" },
      { "value": "option_value_snake_case", "title": "Short title", "description": "One sentence" }
    ]
  }
]

IDs must be "q1", "q2", "q3", "q4". Option values must be unique within each question.
Questions must feel co-constructive ("Is this more about X or Y?"), never interrogative.`

  return generateJSON<ClarificationQuestion[]>(GATE1_SYSTEM, userPrompt, 1024)
}
