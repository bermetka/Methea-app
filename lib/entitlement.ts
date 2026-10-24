import type { Project } from '@/types/database'

/** A paid project is unlocked for this many months from paid_at. */
export const ACCESS_MONTHS = 6

/**
 * Whether the paywall is enforced at `now`. Before PAYWALL_START every project
 * behaves as paid. A missing or unparseable PAYWALL_START fails closed (paywall
 * active) — a config slip must never silently give everything away.
 */
export function isPaywallActive(
  now: Date = new Date(),
  start: string | undefined = process.env.PAYWALL_START
): boolean {
  if (!start) return true
  const startMs = Date.parse(start)
  if (Number.isNaN(startMs)) return true
  return now.getTime() >= startMs
}

/** End of the paid access window (paid_at + ACCESS_MONTHS), or null if never paid. */
export function accessUntil(project: Pick<Project, 'paid_at'>): Date | null {
  if (!project.paid_at) return null
  const paid = new Date(project.paid_at)
  if (Number.isNaN(paid.getTime())) return null
  const until = new Date(paid)
  until.setUTCMonth(until.getUTCMonth() + ACCESS_MONTHS)
  // Clamp month overflow (e.g. Aug 31 + 6 months → Feb 28/29, not Mar 3).
  if (until.getUTCDate() !== paid.getUTCDate()) until.setUTCDate(0)
  return until
}

/** Paid and still inside the access window. */
export function isProjectPaid(project: Pick<Project, 'paid_at'>, now: Date = new Date()): boolean {
  const until = accessUntil(project)
  return !!until && now.getTime() < until.getTime()
}

/** Was paid, but the access window has ended — view-only, like an unpaid project. */
export function isAccessExpired(project: Pick<Project, 'paid_at'>, now: Date = new Date()): boolean {
  return !!project.paid_at && !isProjectPaid(project, now)
}

/**
 * Generation, regeneration, edits and full export. Everything else (viewing
 * already generated content) is open to every project owner.
 */
export function hasFullAccess(project: Pick<Project, 'paid_at'>, now: Date = new Date()): boolean {
  return !isPaywallActive(now) || isProjectPaid(project, now)
}

/** Max unpaid, non-archived projects per user (only counts while the paywall is active). */
export const FREE_PROJECT_CAP = 3

export function countUnpaidProjects(projects: Pick<Project, 'paid_at'>[], now: Date = new Date()): number {
  return projects.filter(p => !hasFullAccess(p, now)).length
}
