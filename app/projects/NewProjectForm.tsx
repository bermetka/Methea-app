'use client'

import { useState } from 'react'
import { createProject } from './actions'

export default function NewProjectForm() {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    const fd = new FormData()
    fd.append('title', title.trim())
    await createProject(fd)
  }

  return (
    <form onSubmit={handleSubmit} style={s.form}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Impact of remote work on team trust"
        style={s.input}
        disabled={submitting}
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!title.trim() || submitting}
        style={{
          ...s.btn,
          ...(!title.trim() || submitting ? s.btnDisabled : {}),
        }}
      >
        {submitting ? 'Creating…' : 'Create project →'}
      </button>
    </form>
  )
}

const s: Record<string, React.CSSProperties> = {
  form:       { display: 'flex', gap: '0.625rem', flexWrap: 'wrap' as const },
  input:      { flex: 1, minWidth: '200px', padding: '0.625rem 0.875rem', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--paper)', outline: 'none' },
  btn:        { padding: '0.625rem 1.125rem', background: 'var(--ink-blue)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  btnDisabled:{ background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
}
