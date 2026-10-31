'use client'

import { useEffect, useRef, useState } from 'react'
import { signOut } from '@/app/actions/auth'

function initials(email: string): string {
  const name = email.split('@')[0] ?? ''
  const parts = name.split(/[._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return (letters || '?').toUpperCase()
}

export default function AccountMenu({ email, upgrade = false }: { email: string; upgrade?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} style={s.wrap}>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{ ...s.avatar, ...(open ? s.avatarOpen : {}) }}
      >
        {initials(email)}
      </button>
      {open && (
        <div role="menu" aria-label="Account" style={s.menu}>
          <p style={s.email}>{email}</p>
          <a role="menuitem" href="/projects" style={s.item}>My projects</a>
          <a role="menuitem" href="/account" style={{ ...s.item, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            Plan &amp; billing
            {upgrade && <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: 'var(--marker-yellow)', color: 'var(--ink)' }}>Upgrade</span>}
          </a>
          <a role="menuitem" href="/projects?how=1#how" style={s.item}>How Methea works</a>
          <form action={signOut} style={s.logoutForm}>
            <button type="submit" role="menuitem" style={s.logout}>Log out</button>
          </form>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap:       { position: 'relative', flexShrink: 0 },
  avatar:     { width: 40, height: 40, borderRadius: 999, border: '1.5px solid var(--ink)', background: 'var(--sheet)', color: 'var(--ink)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' },
  avatarOpen: { background: 'var(--ink)', color: 'var(--paper)' },
  menu:       { position: 'absolute', right: 0, top: 48, width: 240, background: 'var(--sheet)', border: '1px solid var(--stone)', borderRadius: 10, boxShadow: '0 8px 24px rgba(28,28,28,0.10)', padding: 6, display: 'flex', flexDirection: 'column', zIndex: 20 },
  email:      { margin: 0, padding: '8px 10px 10px', fontSize: '0.8125rem', color: 'var(--graphite)', borderBottom: '1px solid var(--stone-soft)', overflow: 'hidden', textOverflow: 'ellipsis' },
  item:       { padding: '10px', borderRadius: 6, color: 'var(--ink)', fontSize: '0.9375rem' },
  logoutForm: { margin: 0, borderTop: '1px solid var(--stone-soft)', marginTop: 4, paddingTop: 4 },
  logout:     { width: '100%', textAlign: 'left', padding: '10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#8E3B2E', fontFamily: 'inherit', fontSize: '0.9375rem', cursor: 'pointer' },
}
