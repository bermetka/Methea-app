'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setError(error.message)
  }

  if (sent) {
    return (
      <div style={styles.card}>
        <p style={styles.sentTitle}>Check your inbox</p>
        <p style={styles.sentBody}>
          We sent a sign-in link to <strong>{email}</strong>.<br />
          Click it to continue — no password needed.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <button onClick={handleGoogle} style={styles.googleBtn} type="button">
        <GoogleIcon />
        Continue with Google
      </button>

      <div style={styles.divider}>
        <span style={styles.dividerText}>or</span>
      </div>

      <form onSubmit={handleMagicLink} style={styles.form}>
        <label style={styles.label} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          placeholder="you@university.edu"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Sending…' : 'Send sign-in link'}
        </button>
      </form>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    border: '1px solid var(--paper-dark)',
    borderRadius: 'var(--radius)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.625rem',
    width: '100%',
    padding: '0.625rem 1rem',
    background: '#fff',
    border: '1px solid #dadce0',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: 'var(--ink)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: 'var(--text-muted)',
    fontSize: '0.8125rem',
  },
  dividerText: {
    flexShrink: 0,
    padding: '0 0.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--ink-mid)',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--paper-dark)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    background: 'var(--paper)',
    color: 'var(--ink)',
    outline: 'none',
  },
  submitBtn: {
    width: '100%',
    padding: '0.625rem 1rem',
    background: 'var(--ink-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
  },
  error: {
    fontSize: '0.8125rem',
    color: '#c0392b',
  },
  sentTitle: {
    fontFamily: 'Playfair Display, serif',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--ink)',
  },
  sentBody: {
    fontSize: '0.9375rem',
    color: 'var(--ink-mid)',
    lineHeight: 1.6,
  },
}
