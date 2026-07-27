import type { Project } from '@/types/database'

export function isProjectPaid(project: Pick<Project, 'paid_at'>): boolean {
  return project.paid_at !== null
}
