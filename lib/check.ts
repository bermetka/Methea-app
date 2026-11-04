// The "Where is your research?" check (/check): what it hands over to sign-up.
// Shared by server and client code — no server-only imports here.

/** JSON {q, path, stage}; set by /check when the visitor clicks through, cleared once a project is made from it. */
export const CHECK_COOKIE = 'methea_check'

export const CHECK_PATHS = ['program', 'applicant'] as const
export type CheckPath = (typeof CHECK_PATHS)[number]

/** Where the visitor's road stops, as the check worked it out (`none` = every piece in place). */
export const CHECK_STAGES = ['who', 'concept', 'lens', 'method', 'time', 'gap', 'none'] as const
export type CheckStage = (typeof CHECK_STAGES)[number]

export interface CheckCarry {
  q: string          // their research question or topic, as typed ('' = only a vague idea)
  path: CheckPath
  stage: CheckStage
}

export const CHECK_QUESTION_MAX = 600

/** Keep only a well-formed carry — the cookie and the sign-in link are client-controlled. */
export function sanitizeCheck(raw: unknown): CheckCarry | null {
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) } catch {
      try { obj = JSON.parse(decodeURIComponent(raw)) } catch { return null }
    }
  }
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const path = (CHECK_PATHS as readonly unknown[]).includes(o.path) ? (o.path as CheckPath) : null
  const stage = (CHECK_STAGES as readonly unknown[]).includes(o.stage) ? (o.stage as CheckStage) : null
  if (!path || !stage) return null
  const q = typeof o.q === 'string'
    ? o.q.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, CHECK_QUESTION_MAX)
    : ''
  return { q, path, stage }
}

/** A working title for the project made from the check: their words, cut at a word boundary. */
export function projectTitleFromCheck(q: string, max = 80): string {
  const t = q.trim().replace(/[?.!]+$/, '')
  if (!t) return 'My research project'
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`
}
