import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'
import Logo from '@/components/ui/Logo'

export const metadata = { title: 'Sign in — Methea' }

export default async function LoginPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/projects')

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <Logo size="md" />
          <p style={styles.tagline}>Your research, methodically.</p>
        </div>
        <LoginForm />
        <p style={styles.footer}>
          By signing in you agree to use Methea as a thinking tool,
          not a writing tool.
        </p>
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
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    textAlign: 'center',
  },
  tagline: {
    marginTop: '0.25rem',
    fontSize: '0.9375rem',
    color: 'var(--text-muted)',
  },
  footer: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: 1.5,
  },
}
