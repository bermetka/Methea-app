import { generateJSON, FAST_MODEL } from '@/lib/claude'
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

  // Plain field extraction: the fast model is enough and cuts the first wait.
  return generateJSON<BriefExtraction>(EXTRACT_BRIEF_SYSTEM, userPrompt, 512, { model: FAST_MODEL })
}

const GATE1_SYSTEM = `You are a research methodology assistant. Your job is to ask up to 3 targeted clarifying questions that help sharpen a student's research question and confirm the right methodology direction.
Generate questions that are specific to their topic — never generic.
Questions 1 and 2 have exactly 3 options each. Question 3 (access) has 4-5 options, and the student may pick several. Options must be clearly distinct.
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

Generate exactly 3 clarifying questions to sharpen this research question. The questions should address:
1. Whether the focus is understanding WHY vs. measuring HOW MUCH (methodology direction)
2. The scope — who/what is being studied and at what scale
3. The student's access to data/participants — several routes can be true at once, so this one is multi-select

Return a JSON array with exactly 3 items. q1 and q2 match this shape:
  {
    "id": "q1",
    "prompt": "the question itself — specific to their topic, not generic",
    "options": [
      { "value": "option_value_snake_case", "title": "Short title (3-5 words)", "description": "One sentence explaining what this means for their research" },
      { "value": "option_value_snake_case", "title": "Short title", "description": "One sentence" },
      { "value": "option_value_snake_case", "title": "Short title", "description": "One sentence" }
    ]
  }
q3 (access) has "multi": true and 4-5 options, phrased for their topic, covering:
- the people they could reach in person (name the place or group if the brief gives one),
- someone who could introduce them to participants (a key informant: an association, NGO, organisation, community leader),
- online groups, chats or platforms where these people are,
- existing or secondary data (reports, statistics, documents, datasets),
- optionally one more route specific to their topic.
Each q3 description says what that route means for their study (e.g. what it makes easier or harder).
  { "id": "q3", "multi": true, "prompt": "…", "options": [ …4-5 options… ] }

IDs must be "q1", "q2", "q3". Option values must be unique within each question. Only q3 has "multi".
Questions must feel co-constructive ("Is this more about X or Y?"), never interrogative.`

  const questions = await generateJSON<ClarificationQuestion[]>(GATE1_SYSTEM, userPrompt, 1400)
  // Only the access question is multi-select, whatever the model returned.
  return (Array.isArray(questions) ? questions : []).map(q => ({ ...q, multi: q.id === 'q3' ? true : undefined }))
}
