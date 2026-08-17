import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
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

  const gate1 = ctx?.socratic_gate_1
  const questions = gate1?.questions ?? []

  // Edge case: questions weren't generated — send back to brief
  if (questions.length === 0) redirect(`/project/${params.id}/brief`)

  // Editable at every visit: a completed gate opens in review mode inside the form,
  // with an "Edit answers" affordance. No hard read-only lock.
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
        <Gate1Form
          projectId={params.id}
          questions={questions}
          brief={ctx.brief}
          initialAnswers={gate1?.responses ?? {}}
          initialContextNote={gate1?.context_note ?? ''}
          completed={!!gate1?.completed}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:          { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--paper)' },
  container:     { width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
}
