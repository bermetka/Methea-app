import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/nav/AppHeader'
import { hasLockedProjects } from '@/lib/access'
import type { ResearchContext } from '@/types/database'

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Pages handle the redirect to /login and notFound themselves.
  if (!user) return <>{children}</>

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, research_context')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <>
      <AppHeader
        email={user.email ?? ''}
        project={project
          ? { id: project.id, title: project.title, ctx: project.research_context as ResearchContext | null }
          : undefined}
      />
      {children}
    </>
  )
}
