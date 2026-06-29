export interface GlossaryTerm {
  id: string
  trigger: string
  shortExplain: string
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: 'qual-vs-quant',
    trigger: 'qualitative, quantitative, or mixed methods',
    shortExplain: "Qualitative research explores meaning and experience through words — interviews, observations, open-ended responses. Quantitative research measures relationships through numbers — surveys, statistical tests. Mixed methods uses both. Methea currently supports qualitative and mixed methods fully — if your study is purely quantitative (e.g. only statistical hypothesis testing), parts of this tool won't fit your project yet.",
  },
  {
    id: 'exploratory-vs-explanatory',
    trigger: 'exploratory, explanatory, or descriptive',
    shortExplain: "Exploratory: you're investigating something not well understood yet — 'why does this happen at all?' Explanatory: you're testing why a known relationship exists — 'why does X cause Y?' Descriptive: you're documenting what's happening without explaining why — 'what does X look like?'",
  },
  {
    id: 'deductive-vs-inductive',
    trigger: 'deductive, inductive, or abductive',
    shortExplain: "Deductive: you start with an existing theory and test it against your data. Inductive: you start with your data and build new theory from what you find. Abductive: you go back and forth — start with a theory, then let surprising data reshape it.",
  },
  {
    id: 'theoretical-vs-conceptual',
    trigger: 'theoretical framework',
    shortExplain: "Theoretical framework = the existing theories you borrow from other researchers. Conceptual framework = YOUR map of how those theories' concepts connect to explain YOUR specific topic. You'll build the theoretical framework first, then we'll help you build your conceptual framework from it.",
  },
  {
    id: 'paradigm',
    trigger: 'paradigm',
    shortExplain: "A paradigm is your basic stance on what counts as knowledge. Interpretivism: reality is socially constructed, multiple valid perspectives exist. Positivism: reality is objective and measurable, one truth to discover. Most qualitative research uses interpretivism.",
  },
  {
    id: 'methodology-vs-method',
    trigger: 'methodology',
    shortExplain: "Methodology is your overall research strategy — for example, case study or ethnography. Method is the specific technique within it — for example, semi-structured interviews or focus groups. One methodology can use multiple methods.",
  },
  {
    id: 'sampling-types',
    trigger: 'purposive sampling',
    shortExplain: "Purposive sampling: you deliberately choose participants who fit specific criteria relevant to your research question — the standard choice for qualitative research. Random sampling: every potential participant has an equal chance of selection, common in quantitative work. Convenience sampling: you select whoever's easiest to access — weaker for rigor, but sometimes unavoidable.",
  },
  {
    id: 'analysis-methods',
    trigger: 'thematic analysis',
    shortExplain: "Thematic Analysis: find patterns across your data — flexible, the most widely used method. Grounded Theory: build new theory directly from your data, used when no existing framework fits well. Framework Analysis: structured comparison across multiple cases using a matrix — common in policy and health research.",
  },
  {
    id: 'interview-structure',
    trigger: 'semi-structured interviews',
    shortExplain: "Structured: the exact same questions, same order, for every participant — easy to compare, less rich. Semi-structured: a set of core questions plus follow-up probes, flexible — the most common choice in qualitative research. Unstructured: an open conversation guided loosely by topic — the richest data, hardest to analyse consistently.",
  },
  {
    id: 'probe-questions',
    trigger: 'probe',
    shortExplain: "A probe is a follow-up question that goes deeper into an answer — 'can you give an example?' or 'what made you feel that way?' Probes turn a short answer into rich, usable data.",
  },
]

export function glossaryTerm(id: string): GlossaryTerm {
  const t = glossaryTerms.find(t => t.id === id)
  if (!t) throw new Error(`Unknown glossary term: ${id}`)
  return t
}
