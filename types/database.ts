/**
 * TypeScript types derived from the Supabase schema.
 * Keep in sync with supabase/schema.sql.
 */

export type ResearchType = 'exploratory' | 'explanatory' | 'descriptive'
export type ProjectStatus = 'active' | 'archived'

export interface ClarificationQuestion {
  id: string
  prompt: string
  options: { value: string; title: string; description: string }[]
}

export interface BriefExtraction {
  topic: string
  research_question: string
  research_type: ResearchType
  constraints: string[]
  degree_level: string
  discipline: string
}

export interface SocraticGate1Response {
  completed: boolean
  responses: Record<string, string>
}

export interface ReadingListItem {
  raw_ref: string
  matched_theory_id: string | null
  match_type: 'in_list' | 'beyond_list' | 'missed' | 'unverified'
  doi: string | null
}

export type CitationStatus = 'verified' | 'unverified' | 'outdated'

// research_context is the central versioned JSON for a project.
// Every sprint reads from and writes to this object.
export interface ResearchContext {
  version: number
  brief?: BriefExtraction
  socratic_gate_1?: {
    completed: boolean
    responses: Record<string, string>
    questions?: ClarificationQuestion[]
  }
  theories?: {
    selected_ids: string[]
    reading_list_items: ReadingListItem[]
  }
  socratic_gate_2?: {
    completed: boolean
    theory_timeline_ok: boolean
  }
  framework?: {
    layout_preset: 'hierarchy' | 'hub-and-spoke' | 'linear'
    relationship_labels: Record<string, string>
    narrative: string
    citation_verification: Record<string, CitationStatus>
  }
  methodology?: {
    paradigm: string
    methodology: string
    data_collection: string
    sample: string
    analysis_method: string
    narrative: string
    alternative?: string
  }
  outdated_blocks: string[]
}

// --- DB row types ---

export interface Project {
  id: string
  user_id: string
  title: string
  status: ProjectStatus
  research_context: ResearchContext
  context_version: number
  created_at: string
  updated_at: string
}

export interface Theory {
  id: string
  name: string
  author: string
  year: number
  summary: string
  concepts: string[]
  disciplines: string[]
  doi: string | null
  openalex_id: string | null
  created_at: string
}

export interface ResearchContextVersion {
  id: string
  project_id: string
  version: number
  context_snapshot: ResearchContext
  changed_block: string
  created_at: string
}
