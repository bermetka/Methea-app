import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import BriefForm from './BriefForm'
import type { Project } from '@/types/database'

export const metadata = { title: "Tell me what you're researching — Methea" }

export default async function BriefPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const p = project as Project

  // Brief submitted but gate1 not done → go to gate1
  if (p.research_context?.brief && !p.research_context?.socratic_gate_1?.completed) {
    redirect(`/project/${params.id}/gate1`)
  }

  // Everything done → go to dashboard
  if (p.research_context?.socratic_gate_1?.completed) {
    redirect(`/project/${params.id}`)
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <Logo size="sm" />
          <h2 style={styles.heading}>Tell me what you&apos;re researching</h2>
          <p style={styles.sub}>A sentence or two is enough to start.</p>
        </div>
        <BriefForm projectId={params.id} />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header:    { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' },
  heading:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 400, letterSpacing: '-0.015em', color: 'var(--ink)', lineHeight: 1.2 },
  sub:       { fontSize: '0.9375rem', color: 'var(--pencil)' },
}
