'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PendingSteps from '@/components/ui/PendingSteps'
import type { StudentListItem, StudentReadingList, VerifiedWork } from '@/types/database'
import type { CardWork, TheoryCardContent } from '@/lib/literature/theory-content'
import { checkReadingList, toggleRead, completeGate2 } from './actions'

export interface Gate2Theory {
  id: string
  name: string
  author: string
  year: number
  summary: string
  concepts: string[]
  whyItFits: string | null
  card: TheoryCardContent | null
  recent: VerifiedWork[]
}

interface Props {
  projectId: string
  theories: Gate2Theory[]
  rawList: string
  list: StudentReadingList | null
  listOutdated: boolean
  readMarks: string[]
  constraints: string[]
  gateDone: boolean
  limit: number
}

// ── Small helpers ──────────────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function keyOf(w: { openalex_id: string | null; doi: string | null; title: string }) {
  return w.openalex_id ?? (w.doi ? `doi:${w.doi}` : `t:${norm(w.title)}`)
}

function cite(w: { authors: string[]; year: number | null }) {
  const s = w.authors.map(a => (a.includes(',') ? a.split(',')[0] : a.split(' ').pop() ?? a).trim())
  const who = s.length > 2 ? `${s[0]} et al.` : s.join(' & ')
  return `${who || 'Unknown'} (${w.year ?? 'n.d.'})`
}

function Chip({ ok, title }: { ok: boolean; title: string }) {
  return (
    <span title={title} aria-label={title} style={{ ...s.chip, background: ok ? 'var(--mint)' : 'var(--stone-soft)', color: ok ? 'var(--moss)' : 'var(--pencil)' }}>
      {ok ? '✓' : '?'}
    </span>
  )
}

function WorkLine({ w, children }: { w: CardWork | VerifiedWork; children?: React.ReactNode }) {
  const verified = 'verified' in w ? w.verified : true
  const href = w.oa_url ?? (w.doi ? `https://doi.org/${w.doi}` : null)
  return (
    <div style={s.workLine}>
      <Chip ok={verified} title={verified ? 'Found in OpenAlex / Crossref' : 'Not found in OpenAlex or Crossref yet: check this source yourself'} />
      <div style={{ minWidth: 0 }}>
        <span style={s.workCite}>{cite(w)}</span>{' '}
        {href ? <a href={href} target="_blank" rel="noreferrer" style={s.workTitle}>{w.title}</a> : <span style={s.workTitleText}>{w.title}</span>}
        {w.oa_url && <span style={s.oaTag}>open access</span>}
        {children}
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function Gate2View(p: Props) {
  const router = useRouter()
  const [list, setList] = useState<StudentReadingList | null>(p.list)
  const [outdated, setOutdated] = useState(p.listOutdated)
  const [text, setText] = useState(p.rawList)
  const [editing, setEditing] = useState(!p.rawList)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marks, setMarks] = useState<Set<string>>(new Set(p.readMarks))
  const [submitting, setSubmitting] = useState<null | 'yes' | 'no'>(null)
  const started = useRef(false)

  async function runCheck(newText?: string) {
    setChecking(true)
    setError(null)
    const res = await checkReadingList(p.projectId, newText)
    setChecking(false)
    if (res.ok) {
      setList(res.list)
      setOutdated(false)
      setEditing(false)
    } else setError(res.error)
  }

  // A list came with the brief but hasn't been checked yet: check it straight away.
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (p.rawList && !p.list) runCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function mark(key: string, read: boolean) {
    const next = new Set(marks)
    if (read) next.add(key)
    else next.delete(key)
    setMarks(next)
    await toggleRead(p.projectId, key, read)
  }

  async function finish(fits: boolean) {
    setSubmitting(fits ? 'yes' : 'no')
    const next = await completeGate2(p.projectId, fits)
    router.push(next)
  }

  const items = list?.items ?? []
  const linkedIds = useMemo(() => new Set(items.filter(i => i.theory_links.length).map(i => i.id)), [items])
  const notLinked = items.filter(i => !linkedIds.has(i.id))

  // Her list as keys, to work out what she "missed" from the curated must-reads.
  const herKeys = useMemo(() => {
    const k = new Set<string>()
    for (const i of items) {
      if (i.work) k.add(keyOf(i.work))
      if (i.work?.doi) k.add(`doi:${i.work.doi}`)
      if (i.parsed.title) k.add(`t:${norm(i.parsed.title)}`)
    }
    return k
  }, [items])
  const inHerList = (w: CardWork) =>
    (w.openalex_id && herKeys.has(w.openalex_id)) || (w.doi && herKeys.has(`doi:${w.doi}`)) || herKeys.has(`t:${norm(w.title)}`)

  const mustReads = p.theories.flatMap(t => t.card?.must_read ?? [])
  const readCount = mustReads.filter(m => marks.has(keyOf(m.work))).length

  return (
    <div style={s.wrap}>
      <header style={s.head}>
        <h1 style={s.h1}>Before you build: what to read</h1>
        <p style={s.lead}>
          For each theory you chose: what it says, how it developed, where it is criticised, and what
          to read. Methea checks your own reading list against it. It points you to the texts; reading
          them is yours.
        </p>
      </header>

      {/* ── Her reading list ─────────────────────────────────────────── */}
      <section style={s.panel} aria-labelledby="yourlist">
        <div style={s.panelHead}>
          <h2 id="yourlist" style={s.h2}>Your reading list</h2>
          {list && !editing && !checking && (
            <button type="button" style={s.linkBtn} onClick={() => setEditing(true)}>Edit list</button>
          )}
        </div>

        {editing && (
          <>
            <p style={s.muted}>Optional. Paste the readings from your course or your own list, one per line (up to {p.limit}). Methea checks that each one exists and how it connects to your theories.</p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={7} style={s.textarea} placeholder={'DiMaggio, P. J., & Powell, W. W. (1983). The iron cage revisited…\nGiddens, A. (1984). The constitution of society.'} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="button" disabled={!text.trim() || checking} onClick={() => runCheck(text)} className={checking ? 'methea-busy' : undefined} style={{ ...s.btn, ...(!text.trim() && !checking ? s.btnOff : {}) }}>
                {checking ? <PendingSteps steps={['Reading your list…', 'Looking up each work in OpenAlex…', 'Checking links to your theories…', 'Matching abstracts to your concepts…']} /> : 'Check my list'}
              </button>
              {list && !checking && <button type="button" style={s.linkBtn} onClick={() => { setEditing(false); setText(p.rawList) }}>Cancel</button>}
            </div>
          </>
        )}

        {!editing && checking && (
          <p style={s.muted} role="status"><PendingSteps steps={['Reading your list…', 'Looking up each work in OpenAlex…', 'Checking links to your theories…', 'Matching abstracts to your concepts…']} /></p>
        )}

        {error && <p style={s.error} role="alert">{error}</p>}

        {list && !editing && !checking && (
          <>
            <p style={s.muted}>
              {items.filter(i => i.status === 'verified').length} of {items.length} works found ·{' '}
              {linkedIds.size} linked to your theories
              {list.truncated ? ` · only the first ${p.limit} were checked` : ''}
            </p>
            {outdated && (
              <div style={s.outdated} role="status">
                <span>⚠ Your theories changed since this list was checked.</span>
                <button type="button" style={s.linkBtn} onClick={() => runCheck()}>Re-check links</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── One card per theory ──────────────────────────────────────── */}
      {p.theories.map(t => {
        const c = t.card
        const mine = items.filter(i => i.theory_links.some(l => l.theory_id === t.id))
        const missed = (c?.must_read ?? []).filter(m => !inHerList(m.work))
        return (
          <article key={t.id} style={s.card} aria-labelledby={`t-${t.id}`}>
            <div>
              <h2 id={`t-${t.id}`} style={s.cardTitle}>{t.name}</h2>
              <p style={s.cardMeta}>{c ? cite(c.original) : `${t.author} (${t.year})`}{c?.status !== 'published' && c ? ' · draft content (preview only)' : ''}</p>
            </div>

            {t.whyItFits && (
              <p style={s.why}><span style={s.label}>Why it fits your question</span><br />{t.whyItFits}</p>
            )}

            {c ? (
              <>
                <p style={s.body}>{c.core_idea}</p>

                <details style={s.details}>
                  <summary style={s.summary}>How it developed</summary>
                  <ol style={s.timeline}>
                    {c.development.map((d, i) => (
                      <li key={i} style={s.timelineItem}>
                        <WorkLine w={d.work}><div style={s.adds}>{d.adds}</div></WorkLine>
                      </li>
                    ))}
                  </ol>
                  {c.strands.length > 0 && (
                    <>
                      <p style={s.label}>Strands</p>
                      <ul style={s.plainList}>
                        {c.strands.map((st, i) => (
                          <li key={i} style={s.strand}><strong>{st.name}.</strong> {st.summary} <span style={s.src}>{cite(st.defining_work)}</span></li>
                        ))}
                      </ul>
                    </>
                  )}
                </details>

                <details style={s.details}>
                  <summary style={s.summary}>Strengths and critiques</summary>
                  <div style={s.twoCol}>
                    <div>
                      <p style={s.label}>Strengths</p>
                      <ul style={s.plainList}>{c.strengths.map((x, i) => <li key={i} style={s.point}>{x.point} <span style={s.src}>{cite(x.source)}</span></li>)}</ul>
                    </div>
                    <div>
                      <p style={s.label}>Critiques</p>
                      <ul style={s.plainList}>{c.critiques.map((x, i) => <li key={i} style={s.point}>{x.point} <span style={s.src}>{cite(x.source)}</span></li>)}</ul>
                    </div>
                  </div>
                </details>

                <details style={s.details}>
                  <summary style={s.summary}>When to use it, and common mistakes</summary>
                  <ul style={s.plainList}>{c.when_to_use.map((x, i) => <li key={i} style={s.point}>{x}</li>)}</ul>
                  <p style={s.label}>Common mistakes</p>
                  <ul style={s.plainList}>{c.common_mistakes.map((x, i) => <li key={i} style={s.point}>{x}</li>)}</ul>
                </details>
              </>
            ) : (
              <>
                <p style={s.body}>{t.summary}</p>
                <p style={s.muted}>A full reading guide for this theory is on its way. Your own list is still checked below.</p>
              </>
            )}

            {/* Reading: in your list / you missed / beyond your list */}
            <div style={s.reading}>
              <p style={s.readingHead}>Reading</p>

              {list && (
                <div>
                  <p style={s.label}>In your list · {mine.length}</p>
                  {mine.length ? mine.map(i => <ListItemLine key={i.id} item={i} theoryId={t.id} />) : <p style={s.muted}>None of your works is linked to this theory yet.</p>}
                </div>
              )}

              {missed.length > 0 && (
                <div>
                  <p style={s.label}>{list ? 'You missed' : 'Start with'} · {missed.length}</p>
                  {missed.map((m, i) => {
                    const k = keyOf(m.work)
                    return (
                      <div key={i} style={s.mustRead}>
                        <WorkLine w={m.work}>
                          {m.chapter && <div style={s.adds}>{m.chapter}</div>}
                          <div style={s.adds}>{m.why_read}</div>
                          <div style={s.question}><span style={s.qMark}>Read for:</span> {m.reading_question}</div>
                        </WorkLine>
                        <label style={s.readMark}>
                          <input type="checkbox" checked={marks.has(k)} onChange={e => mark(k, e.target.checked)} /> I&apos;ve read it
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}

              {t.recent.length > 0 && (
                <div>
                  <p style={s.label}>Beyond your list · recent works citing {c ? cite(c.original) : t.author}</p>
                  {t.recent.map(w => <WorkLine key={keyOf(w)} w={w} />)}
                </div>
              )}
            </div>
          </article>
        )
      })}

      {list && notLinked.length > 0 && (
        <section style={s.panel} aria-labelledby="notlinked">
          <h2 id="notlinked" style={s.h2}>Not linked to your chosen theories · {notLinked.length}</h2>
          <p style={s.muted}>These may still matter for your topic or method. Citation data for older works is incomplete, so a missing link doesn't mean a work is unrelated. If many of them share one theory, it may be worth adding that theory.</p>
          {notLinked.map(i => <ListItemLine key={i.id} item={i} />)}
        </section>
      )}

      {/* ── Gate 2: theory–timeline fit ──────────────────────────────── */}
      <section style={s.gate} aria-labelledby="gate2q">
        <p style={s.label}>Check before you build</p>
        <h2 id="gate2q" style={s.h2}>
          You chose {p.theories.length} {p.theories.length === 1 ? 'theory' : 'theories'}
          {mustReads.length ? ` with ${mustReads.length} core readings` : ''}
          {p.constraints.length ? `, and your brief mentions: ${p.constraints.join('; ')}` : ''}. Can you read and apply {p.theories.length === 1 ? 'it' : 'them'} in the time you have?
        </h2>
        {mustReads.length > 0 && (
          <p style={s.muted}>You&apos;ve marked {readCount} of {mustReads.length} core readings as read. You can continue now and come back to them.</p>
        )}
        <div style={s.gateBtns}>
          <button type="button" disabled={!!submitting} onClick={() => finish(true)} className={submitting === 'yes' ? 'methea-busy' : undefined} style={s.btn}>
            {submitting === 'yes' ? <PendingSteps steps={['Saving…', 'Working out how they relate…', 'Drawing your framework…']} /> : 'Yes, build my framework →'}
          </button>
          <button type="button" disabled={!!submitting} onClick={() => finish(false)} style={s.secondary}>
            {submitting === 'no' ? 'Opening theories…' : 'No, let me narrow my theories'}
          </button>
        </div>
        {p.gateDone && <p style={s.muted}>You confirmed this earlier; you can change your answer.</p>}
      </section>
    </div>
  )
}

function ListItemLine({ item, theoryId }: { item: StudentListItem; theoryId?: string }) {
  const link = theoryId ? item.theory_links.find(l => l.theory_id === theoryId) : null
  if (!item.work) {
    return (
      <div style={s.workLine}>
        <Chip ok={false} title="Not found in OpenAlex or Crossref: check the reference" />
        <div>
          <span style={s.workTitleText}>{item.raw}</span>
          <div style={s.adds}>Not found. Check the spelling, year or DOI; it may also be a source these databases don&apos;t cover.</div>
        </div>
      </div>
    )
  }
  return (
    <WorkLine w={item.work}>
      {link && <div style={s.evidence}>{link.evidence}</div>}
      {item.concept_tags.map((t, i) => (
        <div key={i} style={s.tag}>
          <span style={s.tagConcept}>{t.concept}</span> <span style={s.tagQuote}>“{t.quote}”</span>
        </div>
      ))}
      {!item.abstract_available && <div style={s.adds}>No abstract available, so links to your concepts can&apos;t be shown.</div>}
    </WorkLine>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap:        { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  head:        { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  h1:          { margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontSize: '1.75rem', letterSpacing: '-0.025em', color: 'var(--ink)' },
  lead:        { margin: 0, fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.6 },
  h2:          { margin: 0, fontSize: '1.0625rem', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.015em', lineHeight: 1.4 },
  panel:       { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  panelHead:   { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  textarea:    { width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.875rem', padding: '0.75rem', border: '1px solid var(--stone)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)', color: 'var(--ink)', resize: 'vertical' },
  btn:         { padding: '0.625rem 1.25rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', minHeight: 44 },
  btnOff:      { background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
  secondary:   { padding: '0.625rem 1rem', background: 'transparent', color: 'var(--ink-blue)', border: '1px solid var(--stone)', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', cursor: 'pointer', minHeight: 44 },
  linkBtn:     { background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: '0.875rem', color: 'var(--ink-blue)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 },
  muted:       { margin: 0, fontSize: '0.8125rem', color: 'var(--pencil)', lineHeight: 1.5 },
  error:       { margin: 0, fontSize: '0.875rem', color: 'var(--error)', background: 'var(--error-bg)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' },
  outdated:    { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--warn-text)', background: 'var(--marker-yellow)', padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', width: 'fit-content' },
  card:        { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  cardTitle:   { margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.015em' },
  cardMeta:    { margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--pencil)' },
  why:         { margin: 0, fontSize: '0.875rem', color: 'var(--graphite)', lineHeight: 1.6, borderLeft: '3px solid var(--marker-lime)', paddingLeft: '0.75rem' },
  body:        { margin: 0, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--ink)' },
  details:     { borderTop: '1px solid var(--stone-soft)', paddingTop: '0.625rem' },
  summary:     { cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-blue)' },
  timeline:    { margin: '0.75rem 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' },
  timelineItem:{ fontSize: '0.875rem' },
  plainList:   { margin: '0.375rem 0 0.5rem', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  strand:      { fontSize: '0.875rem', color: 'var(--graphite)', lineHeight: 1.55 },
  point:       { fontSize: '0.875rem', color: 'var(--graphite)', lineHeight: 1.55 },
  src:         { fontSize: '0.75rem', color: 'var(--pencil)', whiteSpace: 'nowrap' },
  twoCol:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' },
  label:       { margin: '0.5rem 0 0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  reading:     { borderTop: '1px solid var(--stone)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  readingHead: { margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' },
  workLine:    { display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.375rem 0', fontSize: '0.875rem', lineHeight: 1.5 },
  chip:        { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0, marginTop: 2, cursor: 'help' },
  workCite:    { fontWeight: 600, color: 'var(--ink)' },
  workTitle:   { color: 'var(--ink-blue)' },
  workTitleText:{ color: 'var(--graphite)' },
  oaTag:       { marginLeft: 6, fontSize: '0.6875rem', color: 'var(--moss)', border: '1px solid var(--mint)', borderRadius: 999, padding: '0 6px' },
  adds:        { fontSize: '0.8125rem', color: 'var(--graphite)', marginTop: 2 },
  evidence:    { fontSize: '0.8125rem', color: 'var(--moss)', marginTop: 2 },
  tag:         { fontSize: '0.8125rem', marginTop: 4, lineHeight: 1.5 },
  tagConcept:  { fontWeight: 600, color: 'var(--ink)', background: 'var(--marker-yellow)', padding: '0 4px', borderRadius: 3 },
  tagQuote:    { color: 'var(--graphite)', fontStyle: 'italic' },
  mustRead:    { display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: '0.375rem', borderBottom: '1px dashed var(--stone-soft)' },
  question:    { fontSize: '0.8125rem', color: 'var(--ink)', marginTop: 4 },
  qMark:       { fontWeight: 600 },
  readMark:    { display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: '0.8125rem', color: 'var(--graphite)', marginLeft: 26, cursor: 'pointer', minHeight: 32 },
  gate:        { background: 'var(--sheet)', border: '1px solid var(--ink-blue)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  gateBtns:    { display: 'flex', gap: 12, flexWrap: 'wrap' },
}
