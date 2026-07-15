'use client'

import { useRef, useState } from 'react'
import { submitBrief } from './actions'
import GlossaryTooltip from '@/components/ui/GlossaryTooltip'
import { glossaryTerm } from '@/lib/glossary'

const DEGREE_LEVELS = [
  { value: 'bachelor',    label: "Bachelor's" },
  { value: 'masters',     label: "Master's" },
  { value: 'phd',         label: 'PhD' },
  { value: 'independent', label: 'Independent researcher' },
]

const DISCIPLINES = [
  'Business & Management', 'Economics', 'Education', 'Engineering',
  'Health Sciences', 'Information Systems', 'Law', 'Political Science',
  'Psychology', 'Public Administration', 'Sociology', 'Other',
]

interface Props { projectId: string }

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx']

const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  FILE_PARSE_FAILED: "We couldn't read that file — it may be corrupted. Try a different file, or continue without it.",
  DEFAULT: 'Something went wrong — please try again.',
}

export default function BriefForm({ projectId }: Props) {
  const [topic, setTopic]             = useState('')
  const [degree, setDegree]           = useState('')
  const [discipline, setDiscipline]   = useState('')
  const [showReading, setShowReading] = useState(false)
  const [showUpload, setShowUpload]   = useState(false)
  const [readingList, setReadingList] = useState('')
  const [file, setFile]               = useState<File | null>(null)
  const [status, setStatus]           = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const isValid = topic.trim().length >= 10 && degree !== '' && discipline !== ''

  function validateFile(f: File): string | null {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Please upload a PDF or Word document (.pdf, .doc, .docx).'
    }
    if (f.size > MAX_FILE_BYTES) {
      return 'That file is larger than 10 MB — try a smaller file.'
    }
    return null
  }

  function acceptFile(f: File) {
    const fileError = validateFile(f)
    if (fileError) {
      setErrors(p => ({ ...p, file: fileError }))
      return
    }
    setErrors(p => ({ ...p, file: '' }))
    setFile(f)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (topic.trim().length < 10)
      e.topic = "A sentence or two helps me understand what you're after — try adding a bit more."
    if (!degree)
      e.degree = 'Please select your degree level so I can tailor the methodology guidance.'
    if (!discipline)
      e.discipline = 'Knowing your discipline helps match the right theoretical traditions.'
    if (file) {
      const fileError = validateFile(file)
      if (fileError) e.file = fileError
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setStatus('submitting')
    setSubmitError('')

    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('topic', topic.trim())
    formData.append('degreeLevel', degree)
    formData.append('discipline', discipline)
    if (readingList.trim()) formData.append('readingList', readingList.trim())
    if (file) formData.append('file', file)

    try {
      const result = await submitBrief(formData)
      if (result?.error) {
        setSubmitError(SUBMIT_ERROR_MESSAGES[result.error] ?? SUBMIT_ERROR_MESSAGES.DEFAULT)
        setStatus('error')
      }
    } catch {
      setSubmitError(SUBMIT_ERROR_MESSAGES.DEFAULT)
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={s.card}>
      {/* Topic textarea */}
      <div>
        <textarea
          value={topic}
          onChange={e => { setTopic(e.target.value); setErrors(p => ({ ...p, topic: '' })) }}
          placeholder='e.g. "How do solo founders in Central Asia decide when to raise outside funding?"'
          rows={4}
          style={{
            ...s.textarea,
            ...(errors.topic ? s.inputError : topic.trim() ? s.inputFilled : {}),
          }}
          disabled={status === 'submitting'}
        />
        {errors.topic && <p style={s.errorText}>{errors.topic}</p>}
        <p style={s.hint}>
          Works with qualitative, quantitative, or mixed methods research.
          <GlossaryTooltip term={glossaryTerm('qual-vs-quant')} />
        </p>
      </div>

      {/* Degree + Discipline */}
      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Degree level</label>
          <select
            value={degree}
            onChange={e => { setDegree(e.target.value); setErrors(p => ({ ...p, degree: '' })) }}
            style={{ ...s.select, ...(errors.degree ? s.inputError : {}) }}
            disabled={status === 'submitting'}
          >
            <option value="">Select...</option>
            {DEGREE_LEVELS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          {errors.degree && <p style={s.errorText}>{errors.degree}</p>}
        </div>
        <div style={s.field}>
          <label style={s.label}>Discipline</label>
          <select
            value={discipline}
            onChange={e => { setDiscipline(e.target.value); setErrors(p => ({ ...p, discipline: '' })) }}
            style={{ ...s.select, ...(errors.discipline ? s.inputError : {}) }}
            disabled={status === 'submitting'}
          >
            <option value="">Select...</option>
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.discipline && <p style={s.errorText}>{errors.discipline}</p>}
        </div>
      </div>

      {/* Optional: reading list */}
      <div>
        <button type="button" onClick={() => setShowReading(v => !v)} style={s.disclosure}>
          {showReading ? '▾' : '▸'} Have a reading list already?{' '}
          <span style={s.optional}>(optional)</span>
        </button>
        {showReading && (
          <textarea
            value={readingList}
            onChange={e => setReadingList(e.target.value)}
            placeholder="Paste your reading list here — one entry per line or as a block of text."
            rows={5}
            style={{ ...s.textarea, marginTop: '0.5rem' }}
            disabled={status === 'submitting'}
          />
        )}
      </div>

      {/* Optional: file upload */}
      <div>
        <button type="button" onClick={() => setShowUpload(v => !v)} style={s.disclosure}>
          {showUpload ? '▾' : '▸'} Upload your assignment brief / TOR{' '}
          <span style={s.optional}>(optional)</span>
        </button>
        {showUpload && (
          <div
            style={{ ...s.dropzone, ...(errors.file ? s.inputError : {}) }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) acceptFile(f)
            }}
          >
            {file
              ? <span style={{ color: 'var(--ink-blue)', fontWeight: 500 }}>📄 {file.name}</span>
              : <span style={{ color: 'var(--pencil)' }}>Drag a PDF or Word file here, or <u>click to browse</u></span>
            }
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) acceptFile(f)
                e.target.value = ''
              }}
            />
          </div>
        )}
        {errors.file && <p style={s.errorText}>{errors.file}</p>}
      </div>

      {status === 'error' && (
        <p style={s.errorText}>{submitError || SUBMIT_ERROR_MESSAGES.DEFAULT}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'submitting'}
        style={{
          ...s.btn,
          ...(status === 'submitting' ? s.btnLoading : !isValid ? s.btnDisabled : {}),
        }}
      >
        {status === 'submitting'
          ? <><Spinner /> Reading your brief...</>
          : 'Start my research →'
        }
      </button>
    </form>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '14px', height: '14px',
      border: '2px solid var(--marker-lime)',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      marginRight: '0.5rem',
      verticalAlign: 'middle',
    }} />
  )
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    color: 'var(--ink)',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.6,
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    color: 'var(--ink)',
    outline: 'none',
    cursor: 'pointer',
  },
  inputError:  { background: 'var(--error-bg)', borderColor: 'var(--error)' },
  inputFilled: { borderColor: 'var(--stone)' },
  row:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: '0.8125rem', fontWeight: 500, color: 'var(--graphite)' },
  disclosure: {
    background: 'none', border: 'none', padding: 0,
    fontSize: '0.9375rem', fontFamily: 'inherit',
    color: 'var(--ink-blue)', cursor: 'pointer', textAlign: 'left',
  },
  optional: { color: 'var(--pencil)', fontWeight: 400 },
  dropzone: {
    marginTop: '0.5rem',
    border: '1px dashed var(--stone)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    cursor: 'pointer',
    background: 'var(--sheet)',
  },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0.75rem 1.25rem',
    background: 'var(--ink-blue)', color: 'var(--sheet)',
    border: 'none', borderRadius: 'var(--radius)',
    fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600,
    cursor: 'pointer', alignSelf: 'flex-end',
  },
  btnDisabled: { background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
  btnLoading:  { background: 'var(--ink-blue)', cursor: 'wait' },
  errorText: { fontSize: '0.8125rem', color: 'var(--error)', marginTop: '0.375rem', lineHeight: 1.4 },
  hint:      { fontSize: '0.8125rem', color: 'var(--pencil)', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' },
}
