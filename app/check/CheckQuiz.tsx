'use client'

import { useEffect, useRef, useState } from 'react'
import { trackCheck } from '@/app/actions/funnel'
import { pushConversion } from '@/lib/consent'
import { CHECK_COOKIE, CHECK_QUESTION_MAX, type CheckPath, type CheckStage } from '@/lib/check'
import styles from './check.module.css'

// "Where is your research proposal right now?" — one page: the questions open one
// after another as she answers, then the result lists what she has, what's missing
// and where to start. Static rules, no AI.
// The question they type stays in this browser until they click through; only
// then is it put in a cookie for sign-up to start their first project from.

const BLOG = '/blog/'
const UTM = '?utm_source=quiz&utm_medium=lead_magnet&utm_campaign=readiness-check'
const READ: Record<string, { href: string; label: string }> = {
  narrow: { href: `${BLOG}how-to-narrow-down-a-research-question${UTM}`, label: 'Read: how to narrow down a research question →' },
  concept: { href: `${BLOG}how-to-choose-a-theoretical-framework${UTM}#what-is-a-concept`, label: 'Read: what a concept is, with examples →' },
  theory: { href: `${BLOG}how-to-choose-a-theoretical-framework${UTM}`, label: 'Read: how to choose a theoretical framework →' },
}

const JOURNEY: Record<CheckPath, string[]> = {
  program: ['Topic', 'Question', 'Lens', 'Method', 'Ready'],
  applicant: ['Topic', 'Question', 'Lens', 'Method', 'Proposal'],
}

type Answer = 'yes' | 'partly' | 'notyet'
type StepId = Exclude<CheckStage, 'none'>

interface Step {
  id: StepId
  reach: number
  applicantOnly?: boolean
  have: string | Record<CheckPath, string>
  /** What's missing, as a short label for the result list */
  missing: string
  q: string | Record<CheckPath, string>
  example: React.ReactNode
  yes: string
  move: string
  read: keyof typeof READ | null
}

const STEPS: Step[] = [
  {
    id: 'who', missing: "Who and where you'll study", reach: 1, have: 'You know who and where you will study',
    q: "Do you know who you'd study, and where?",
    example: <p className={styles.example}>For example: &ldquo;women founders of early-stage businesses in Bishkek and Almaty&rdquo;.</p>,
    yes: 'Nice. Knowing your people and place is the step most proposals skip.',
    move: 'Pick one group you could actually talk to, and one place. Write it next to your topic.',
    read: 'narrow',
  },
  {
    id: 'concept', missing: "The one idea at the heart of it", reach: 1, have: 'You can name the one idea at the heart of it',
    q: 'Can you name the one idea you want to understand?',
    example: (
      <>
        <p className={styles.exampleLead}>Topics turn into research when you find the idea inside them:</p>
        <div className={styles.pairs}>
          <span className={styles.weak}>Social media</span><span aria-hidden="true">→</span><span className={styles.strong}>Social comparison</span>
          <span className={styles.weak}>Remote work</span><span aria-hidden="true">→</span><span className={styles.strong}>Trust</span>
          <span className={styles.weak}>Starting a business</span><span aria-hidden="true">→</span><span className={styles.strong}>Testing ideas before launch</span>
        </div>
      </>
    ),
    yes: 'Great. That idea is what a theory will attach to.',
    move: "Ask yourself: what exactly happens to these people that I'm curious about? That's your idea.",
    read: 'concept',
  },
  {
    id: 'lens', missing: "A theory for that idea", reach: 2, have: 'You have a theory in mind',
    q: 'Do you have a theory in mind for that idea?',
    example: <p className={styles.example}>Trust → Social Exchange Theory. Adopting something new → Diffusion of Innovations. Motivation → Self-Determination Theory.</p>,
    yes: 'You have a lens. Now your study has a way of looking, not just a subject.',
    move: 'Search by your idea, not your topic: "trust theory", not "remote work theory". Note two or three names you keep seeing.',
    read: 'theory',
  },
  {
    id: 'method', missing: "How you'll collect your data", reach: 3, have: "You know how you'll find out",
    q: "Do you know how you'd collect your data?",
    example: <p className={styles.example}><strong>How / why</strong> questions usually mean interviews or a case study.<br /><strong>How much / to what extent</strong> usually means a survey or existing data.</p>,
    yes: 'Good. Your question and method are starting to point the same way.',
    move: 'Look at your question word. "How" leans to interviews, "to what extent" to a survey. Start there.',
    read: 'narrow',
  },
  {
    id: 'time', missing: "A size that fits your time", reach: 4,
    have: { program: 'It fits your timeline', applicant: 'It fits the length of the program' },
    q: { program: 'Could you do it before your deadline?', applicant: "Could you do it within the program (1–2 years for a Master's, 3–4 for a PhD)?" },
    example: <p className={styles.example}>Can you reach the people, collect the data and still have time to analyse it?</p>,
    yes: "That's a study you can actually finish. Supervisors love that.",
    move: 'If it feels big, make the group or the place smaller, not the idea.',
    read: 'narrow',
  },
  {
    id: 'gap', missing: "What's new about your study", reach: 5, applicantOnly: true, have: "You can say what's new about it",
    q: "Could you say in one sentence what's new about your study?",
    example: <p className={styles.example}>&ldquo;Most studies look at X, but we know little about Y, and that matters because…&rdquo;</p>,
    yes: 'That sentence is the heart of a strong proposal.',
    move: "Read three or four recent papers on your idea and note what they don't cover. That's usually your sentence.",
    read: null,
  },
]

const RESULT: Record<CheckStage, { title: string; body: string; next: string; shape?: boolean }> = {
  who: { title: "You have a topic. That's exactly where every proposal starts.", body: "The next move is small: turn your topic into a question with real people, a real place and one idea. Once that's done, everything after it gets easier.", next: 'Turn your topic into a question', shape: true },
  concept: { title: "You have a topic. That's exactly where every proposal starts.", body: "You already know who you care about. The next move is to find the one idea inside your topic. That's what a theory and a method will attach to.", next: 'Find the one idea inside your topic', shape: true },
  lens: { title: 'Your question is taking shape. Time to pick a lens.', body: "You have people, a place and an idea. That's a real research question. Now a theory can give you a way of looking at it, and the questions you'll ask.", next: 'Find a theory that fits your idea' },
  method: { title: "Question and lens are in place. Now decide how you'll find out.", body: 'This is further than most people get on their own. The method follows from what you already have, so this step is shorter than it looks.', next: 'Match your method to your question' },
  time: { title: 'Almost there. Just right-size it.', body: 'Your study holds together. The last check is whether it fits your time. Usually that means a smaller group or place, not a smaller idea.', next: 'Make it fit your time' },
  gap: { title: "Your study holds together. Now show what's new about it.", body: 'Question, lens and method line up. What turns that into a strong proposal is one clear sentence about what your study adds.', next: 'Write your "what\'s new" sentence' },
  none: { title: "You're ready to build it out.", body: 'Every piece is in place. The next step is turning it into a full research design you can explain in a meeting or an application.', next: 'Put it all on one page' },
}

const pick = (v: string | Record<CheckPath, string>, path: CheckPath) => (typeof v === 'string' ? v : v[path])

function Journey({ path, reached, current }: { path: CheckPath; reached: number; current: number }) {
  const names = JOURNEY[path]
  return (
    <div className={styles.journey} style={{ ['--n' as string]: names.length }} aria-hidden="true">
      {names.map((n, i) => (
        <div key={n} className={`${styles.step} ${i < reached ? styles.done : i === current ? styles.now : ''}`}>
          <i />
          <span>{n}</span>
        </div>
      ))}
    </div>
  )
}

export default function CheckQuiz({ priceLabel }: { priceLabel: string }) {
  const [path, setPath] = useState<CheckPath | null>(null)
  const [rq, setRq] = useState('')
  const [answers, setAnswers] = useState<Partial<Record<StepId, Answer>>>({})
  const refs = useRef<Record<string, HTMLElement | null>>({})
  const completed = useRef(false)
  const lastOpened = useRef<string | null>(null)

  useEffect(() => { trackCheck('check_view') }, [])

  const p: CheckPath = path ?? 'program'
  const steps = STEPS.filter(s => !s.applicantOnly || p === 'applicant')
  // Questions open one at a time: up to and including the first unanswered one.
  const firstOpen = steps.findIndex(s => !answers[s.id])
  const shown = path ? (firstOpen === -1 ? steps : steps.slice(0, firstOpen + 1)) : []
  const done = !!path && firstOpen === -1

  const gaps = steps.filter(s => answers[s.id] && answers[s.id] !== 'yes')
  const stop = gaps[0] ?? null
  const stage: CheckStage = stop ? stop.id : 'none'
  const reached = stop ? stop.reach : JOURNEY[p].length
  const result = RESULT[stage]
  const idea = rq.trim()

  // Bring the newly opened question (or the result) into view, gently.
  const openId = done ? 'result' : path ? steps[firstOpen]?.id ?? null : null
  useEffect(() => {
    if (!openId || openId === lastOpened.current) return
    const first = lastOpened.current === null
    lastOpened.current = openId
    if (first && openId !== 'result') return
    const el = refs.current[openId]
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: openId === 'result' ? 'start' : 'center' })
  }, [openId])

  useEffect(() => {
    if (done && !completed.current) {
      completed.current = true
      trackCheck('check_complete', { path: p, stage })
      pushConversion({ event: 'quiz_complete' })
    }
  }, [done, p, stage])

  function choosePath(next: CheckPath) {
    setPath(next)
    window.setTimeout(() => refs.current.idea?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  function answer(id: StepId, a: Answer) { setAnswers(prev => ({ ...prev, [id]: a })) }
  function restart() {
    setRq(''); setAnswers({}); setPath(null); completed.current = false; lastOpened.current = null
    window.scrollTo({ top: 0 })
  }

  // Hand the question over to sign-up (read by /check/start and the auth callback).
  function handOver() {
    const value = encodeURIComponent(JSON.stringify({ q: idea.slice(0, CHECK_QUESTION_MAX), path: p, stage }))
    const secure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `${CHECK_COOKIE}=${value}; path=/; max-age=${7 * 24 * 3600}; samesite=lax${secure}`
    trackCheck('check_cta', { path: p, stage })
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.stack} aria-labelledby="h-intro">
        <span className={styles.eyebrow}>2 minutes · free · no sign-up</span>
        <h1 id="h-intro" className={styles.h1}>Where is your research proposal <span className={styles.mark}>right now</span>?</h1>
        <p className={styles.lede}>Every proposal goes the same way: a topic becomes a question, the question finds a lens, the lens points to a method. Answer {p === 'applicant' ? 'six' : 'five'} quick questions about your own idea and see what you already have, what&apos;s still missing, and where to start.</p>
        <div className={styles.stack} role="group" aria-label="Which describes you?">
          {(['program', 'applicant'] as CheckPath[]).map(k => (
            <button key={k} type="button" className={styles.path} aria-pressed={path === k} onClick={() => choosePath(k)}>
              <strong>{k === 'program' ? 'I’m working on my thesis or dissertation' : 'I’m applying and need a research proposal'}</strong>
              <span>{k === 'program' ? 'Master’s or PhD, already in a program' : 'PhD, research Master’s or a scholarship'}</span>
            </button>
          ))}
        </div>
        {!path && (
          <div className={styles.byline}>
            <span className={styles.av} aria-hidden="true">BK</span>
            <span>Made by Bermet Koshoeva, university lecturer and founder of Methea. The same steps she walks her students through.</span>
          </div>
        )}
      </section>

      {path && (
        <section className={styles.card} ref={el => { refs.current.idea = el }} style={{ scrollMarginTop: '1rem' }}>
          <label htmlFor="rq" className={styles.label}>{path === 'applicant' ? 'Your proposal idea' : 'Your thesis idea'} <span className={styles.hint}>(optional)</span></label>
          <textarea id="rq" className={styles.textarea} maxLength={CHECK_QUESTION_MAX} value={rq} onChange={e => setRq(e.target.value)}
            placeholder="A rough question, a topic, a few words. e.g. women entrepreneurs in Central Asia and how they test new business ideas" />
          <span className={styles.hint}>Nothing is saved or sent while you take the check.</span>
        </section>
      )}

      {shown.length > 0 && (
        <ol className={styles.qlist} aria-live="polite">
          {shown.map((s, n) => {
            const a = answers[s.id]
            return (
              <li key={s.id} ref={el => { refs.current[s.id] = el }} className={`${styles.card} ${a ? styles.answered : styles.active}`}>
                <span className={styles.eyebrow}>{n + 1} of {steps.length}</span>
                <h2 className={a ? styles.h3 : styles.h2}>{pick(s.q, p)}</h2>
                {!a && s.example}
                <div className={styles.answers} role="group" aria-label="Your answer">
                  {(['yes', 'partly', 'notyet'] as Answer[]).map(o => (
                    <button key={o} type="button" aria-pressed={a === o} onClick={() => answer(s.id, o)}>
                      {o === 'yes' ? 'Yes' : o === 'partly' ? 'Partly' : 'Not yet'}
                    </button>
                  ))}
                </div>
                {a && (a === 'yes'
                  ? <p className={`${styles.line} ${styles.lineOk}`}>✓ {s.yes}</p>
                  : <p className={`${styles.line} ${styles.lineNext}`}><b>{a === 'partly' ? 'On your way.' : 'Normal at this stage.'}</b> {s.move}</p>)}
              </li>
            )
          })}
        </ol>
      )}

      {done && (
        <section className={styles.stack} aria-labelledby="r-title" ref={el => { refs.current.result = el }} style={{ scrollMarginTop: '1rem', marginTop: 24 }}>
          <span className={styles.eyebrow}>Your research, so far</span>
          <Journey path={p} reached={reached} current={stop ? reached : -1} />
          <h2 id="r-title" className={styles.h1}>{result.title}</h2>

          <div className={styles.card}>
            <h3 className={styles.h3}>What you already have</h3>
            <ul className={styles.have}>
              <li>A topic you care about</li>
              {steps.filter(s => answers[s.id] === 'yes').map(s => <li key={s.id}>{pick(s.have, p)}</li>)}
            </ul>
          </div>

          {gaps.length > 0 ? (
            <div className={styles.nextCard}>
              <h3 className={styles.h3}>What&apos;s still missing</h3>
              <ol className={styles.missing}>
                {gaps.map((g, n) => (
                  <li key={g.id} className={n === 0 ? styles.first : undefined}>
                    <span className={styles.missLabel}>
                      {g.missing}
                      {answers[g.id] === 'partly' && <span className={styles.tag}>in progress</span>}
                      {n === 0 && <span className={styles.tagStart}>start here</span>}
                    </span>
                    {n === 0 && (
                      <>
                        <p>{g.move}</p>
                        {result.shape && (
                          <div className={styles.shape}>A shape that works for many proposals:<br />How do <em>who</em> in <em>where</em> experience <em>one idea</em>?</div>
                        )}
                        {g.read && <a href={READ[g.read].href}>{READ[g.read].label}</a>}
                      </>
                    )}
                  </li>
                ))}
              </ol>
              {gaps.length > 1 && <p className={styles.later}>Only the first one matters today. The rest gets easier once it&apos;s done.</p>}
            </div>
          ) : (
            <div className={styles.nextCard}>
              <h3 className={styles.h3}>{result.next}</h3>
              <p>Write your question, your theory and your method as three short lines. If you can explain how each one leads to the next, you&apos;re ready to write.</p>
            </div>
          )}

          <div className={styles.cta}>
            <h2 className={styles.h2}>{p === 'applicant' ? 'Keep going with your proposal in Methea' : 'Keep going with your idea in Methea'}</h2>
            <p>Methea picks up right where you are. It suggests a sharper version of your question, theories that fit your idea (with real, checked sources), and a method that matches. You stay the author; it walks the road with you.</p>
            <p className={styles.startFrom}>{idea ? `Picking up from: "${idea}"` : 'Picking up from your idea, however rough it is.'}</p>
            <a className={styles.ctaBtn} href="/check/start" onClick={handOver}>
              {p === 'applicant' ? 'Continue my proposal in Methea' : 'Continue my research in Methea'}
            </a>
            <small>Free to start, no card: sharpen your question, find theories that fit, draw your framework. Full methodology, interview guide and export are {priceLabel} per project.</small>
          </div>

          <div className={styles.btnRow}>
            <button type="button" className={styles.ghost} onClick={restart}>Start again with another idea</button>
          </div>
        </section>
      )}
    </div>
  )
}
