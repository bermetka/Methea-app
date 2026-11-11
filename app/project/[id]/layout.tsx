import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/nav/AppHeader'
import GuestHeader from '@/components/nav/GuestHeader'
import { hasLockedProjects } from '@/lib/access'
import type { ResearchContext } from '@/types/database'

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Pages handle the redirect to /login and notFound themselves.
  if (!user) return <>{children}</>
  // Guest without an email yet: no links into the app. With one (not confirmed yet): the usual header.
  if (user.is_anonymous && !user.new_email) return <><GuestHeader />{children}</>

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, research_context')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <>
      <AppHeader
        email={user.email || user.new_email || ''}
        project={project
          ? { id: project.id, title: project.title, ctx: project.research_context as ResearchContext | null }
          : undefined}
      />
      {user.is_anonymous && user.new_email && (
        <p style={pendingBanner}>
          Saved to <strong>{user.new_email}</strong>. Open the link we sent to confirm it — only needed before you pay.
        </p>
      )}
      {children}
    </>
  )
}

const pendingBanner: React.CSSProperties = {
  maxWidth: 680, margin: '12px auto 0', padding: '10px 14px', borderRadius: 8,
  background: '#FFF6D6', border: '1px solid #EBD98F', color: '#5A4A10', fontSize: '0.8125rem', lineHeight: 1.45,
}
