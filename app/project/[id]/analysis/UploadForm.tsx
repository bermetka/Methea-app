'use client'

import { useRef, useState } from 'react'
import { runTranscriptAnalysis } from './actions'

export default function UploadForm({ projectId }: { projectId: string }) {
  const [dragging, setDragging]   = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    const ok = ['txt', 'docx', 'doc', 'pdf'].some(ext => f.name.toLowerCase().endsWith(`.${ext}`))
    if (!ok) { setError('Please upload a .txt, .docx, or .pdf file.'); return }
    setError(null)
    setFile(f)
  }

  async function submit() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('projectId', projectId)
      fd.append('transcript', file)
      await runTranscriptAnalysis(fd)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div style={s.wrap}>
      {/* Drop zone */}
      <div
        style={{ ...s.drop, ...(dragging ? s.dropActive : {}), ...(file ? s.dropFilled : {}) }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload transcript file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.docx,.doc,.pdf"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {file ? (
          <>
            <p style={s.fileIcon}>📄</p>
            <p style={s.fileName}>{file.name}</p>
            <p style={s.fileSize}>{(file.size / 1024).toFixed(0)} KB</p>
          </>
        ) : (
          <>
            <p style={s.dropIcon}>↑</p>
            <p style={s.dropLabel}>Drop your transcript here</p>
            <p style={s.dropHint}>.txt · .docx · .pdf — up to ~20 pages</p>
          </>
        )}
      </div>

      {error && <p style={s.error}>{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!file || loading}
        style={{ ...s.btn, ...((!file || loading) ? s.btnDisabled : {}) }}
      >
        {loading ? 'Coding transcript…' : 'Code transcript →'}
      </button>

      {loading && (
        <p style={s.hint}>
          Methea is reading your transcript and matching quotes to your framework concepts.
          This takes 20–40 seconds.
        </p>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap:       { display: 'flex', flexDirection: 'column', gap: '1rem' },
  drop:       {
    border: '2px dashed var(--stone)',
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'var(--paper)',
    transition: 'border-color 0.15s, background 0.15s',
  },
  dropActive: { borderColor: 'var(--ink-blue)', background: 'var(--paper-deep)' },
  dropFilled: { borderColor: 'var(--marker-green)', borderStyle: 'solid' },
  dropIcon:   { fontSize: '1.5rem', color: 'var(--pencil)', marginBottom: '0.5rem' },
  dropLabel:  { fontWeight: 600, color: 'var(--ink)', fontSize: '0.9375rem' },
  dropHint:   { fontSize: '0.8125rem', color: 'var(--pencil)', marginTop: '0.25rem' },
  fileIcon:   { fontSize: '1.5rem', marginBottom: '0.25rem' },
  fileName:   { fontWeight: 600, color: 'var(--ink)', fontSize: '0.9375rem' },
  fileSize:   { fontSize: '0.8125rem', color: 'var(--pencil)', marginTop: '0.15rem' },
  error:      { fontSize: '0.875rem', color: 'var(--error)', lineHeight: 1.5 },
  btn:        {
    padding: '0.75rem 1.5rem',
    background: 'var(--ink)',
    color: 'var(--sheet)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  btnDisabled:{ opacity: 0.45, cursor: 'not-allowed' },
  hint:       { fontSize: '0.8125rem', color: 'var(--pencil)', lineHeight: 1.6, fontStyle: 'italic' },
}
