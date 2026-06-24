import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Gate1Form from './Gate1Form'
import type { Project } from '@/types/database'

export const metadata = { title: 'Sharpening your research question — Methea' }

export default async function Gate1Page({ params }: { params: { id: string } }) {
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
  const ctx = p.research_context

  // Guard: must have a brief before gate1
  if (!ctx?.brief) redirect(`/project/${params.id}/brief`)

  // Gate1 already completed → go to dashboard
  if (ctx?.socratic_gate_1?.completed) redirect(`/project/${params.id}`)

  const questions = ctx?.socratic_gate_1?.questions ?? []

  // Edge case: questions weren't generated — send back to brief
  if (questions.length === 0) redirect(`/project/${params.id}/brief`)

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <span style={styles.wordmark}>Methea</span>
        <Gate1Form
          projectId={params.id}
          questions={questions}
          brief={ctx.brief}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' },
  container: { width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  wordmark:  { fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--ink)' },
}
