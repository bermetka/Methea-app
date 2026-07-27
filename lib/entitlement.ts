import type { Project } from '@/types/database'

export function isProjectPaid(project: Pick<Project, 'paid_at'>): boolean {
  return Boolean(project.paid_at)
}
