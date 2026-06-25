import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createFirstProject } from './actions'

export const metadata = { title: 'Start your project — Methea' }

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If user already has a project, go straight there
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (projects && projects.length > 0) {
    redirect(`/project/${projects[0].id}`)
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <span style={styles.wordmark}>Methea</span>
        <h1 style={styles.heading}>Start your research project</h1>
        <p style={styles.sub}>
          Give it a working title — you can change this any time.
        </p>
        <form action={createFirstProject} style={styles.form}>
          <input
            name="title"
            type="text"
            placeholder="e.g. Impact of remote work on team trust"
            required
            style={styles.input}
            autoFocus
          />
          <button type="submit" style={styles.btn}>
            Create project →
          </button>
        </form>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
  },
  container: {
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  wordmark: {
    fontFamily: 'Playfair Display, Georgia, serif',
    fontSize: '1.25rem',
    fontWeight: 600,
    letterSpacing: '-0.045em',
    color: 'var(--ink)',
  },
  heading: {
    fontSize: '1.75rem',
    color: 'var(--ink)',
    marginTop: '0.5rem',
  },
  sub: {
    fontSize: '0.9375rem',
    color: 'var(--text-muted)',
  },
  form: {
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--paper-dark)',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontFamily: 'inherit',
    background: '#fff',
    color: 'var(--ink)',
    outline: 'none',
  },
  btn: {
    padding: '0.75rem 1.25rem',
    background: 'var(--ink-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
}
