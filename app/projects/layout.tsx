import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/nav/AppHeader'

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <>{children}</>
  return (
    <>
      <AppHeader email={user.email ?? ''} />
      {children}
    </>
  )
}
