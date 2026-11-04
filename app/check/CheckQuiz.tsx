'use client'

import { useEffect, useRef, useState } from 'react'
import { trackCheck } from '@/app/actions/funnel'
import { CHECK_COOKIE, CHECK_QUESTION_MAX, type CheckPath, type CheckStage } from '@/lib/check'
import styles from './check.module.css'

// "Where is your research proposal right now?" — a calm walk from topic to
// proposal: what they already have, and the one next move. Static rules, no AI.
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
  q: string | Record<CheckPath, string>
  example: React.ReactNode
  yes: string
  move: string
  read: keyof typeof READ | null
}

const STEPS: Step[] = [
  {
    id: 'who', reach: 1, have: 'You know who and where you will study',
    q: "Do you know who you'd study, and where?",
    example: <p className={styles.example}>For example: &ldquo;women founders of early-stage businesses in Bishkek and Almaty&rdquo;.</p>,
    yes: 'Nice. Knowing your people and place is the step most proposals skip.',
    move: 'Pick one group you could actually talk to, and one place. Write it next to your topic.',
    read: 'narrow',
  },
  {
    id: 'concept', reach: 1, have: 'You can name the one idea at the heart of it',
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
    id: 'lens', reach: 2, have: 'You have a theory in mind',
    q: 'Do you have a theory in mind for that idea?',
    example: <p className={styles.example}>Trust → Social Exchange Theory. Adopting something new → Diffusion of Innovations. Motivation → Self-Determination Theory.</p>,
    yes: 'You have a lens. Now your study has a way of looking, not just a subject.',
    move: 'Search by your idea, not your topic: "trust theory", not "remote work theory". Note two or three names you keep seeing.',
    read: 'theory',
  },
  {
    id: 'method', reach: 3, have: "You know how you'll find out",
    q: "Do you know how you'd collect your data?",
    example: <p className={styles.example}><strong>How / why</strong> questions usually mean interviews or a case study.<br /><strong>How much / to what extent</strong> usually means a survey or existing data.</p>,
    yes: 'Good. Your question and method are starting to point the same way.',
    move: 'Look at your question word. "How" leans to interviews, "to what extent" to a survey. Start there.',
    read: 'narrow',
  },
  {
    id: 'time', reach: 4,
    have: { program: 'It fits your timeline', applicant: 'It fits the length of the program' },
    q: { program: 'Could you do it before your deadline?', applicant: "Could you do it within the program (1–2 years for a Master's, 3–4 for a PhD)?" },
    example: <p className={styles.example}>Can you reach the people, collect the data and still have time to analyse it?</p>,
    yes: "That's a study you can actually finish. Supervisors love that.",
    move: 'If it feels big, make the group or the place smaller, not the idea.',
    read: 'narrow',
  },
  {
    id: 'gap', reach: 5, applicantOnly: true, have: "You can say what's new about it",
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
  const [view, setView] = useState<'intro' | 'input' | 'check' | 'result'>('intro')
  const [path, setPath] = useState<CheckPath>('program')
  const [rq, setRq] = useState('')
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Partial<Record<StepId, Answer>>>({})
  const top = useRef<HTMLDivElement>(null)

  useEffect(() => { trackCheck('check_view') }, [])
  useEffect(() => { top.current?.scrollIntoView({ block: 'start' }) }, [view, i])

  const steps = STEPS.filter(s => !s.applicantOnly || path === 'applicant')
  const step = steps[i]
  const answer = step ? answers[step.id] : undefined

  // Where the road stops: the first step not answered "yes".
  const stop = steps.find(s => answers[s.id] !== 'yes') ?? null
  const stage: CheckStage = stop ? stop.id : 'none'
  const reached = stop ? stop.reach : JOURNEY[path].length
  const result = RESULT[stage]
  const later = steps.filter(s => answers[s.id] !== 'yes' && s.id !== stop?.id).length
  const idea = rq.trim()

  function choosePath(p: CheckPath) { setPath(p); setView('input') }
  function begin() { setI(0); setAnswers({}); setView('check') }
  function next() {
    if (i < steps.length - 1) setI(i + 1)
    else {
      setView('result')
      trackCheck('check_complete', { path, stage })
    }
  }
  function back() { if (i === 0) setView('input'); else setI(i - 1) }

  // Hand the question over to sign-up (read by /check/start and the auth callback).
  function handOver() {
    const value = encodeURIComponent(JSON.stringify({ q: idea.slice(0, CHECK_QUESTION_MAX), path, stage }))
    const secure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `${CHECK_COOKIE}=${value}; path=/; max-age=${7 * 24 * 3600}; samesite=lax${secure}`
    trackCheck('check_cta', { path, stage })
  }

  return (
    <div className={styles.wrap} ref={top}>
      {view === 'intro' && (
        <section className={styles.stack} aria-labelledby="h-intro">
          <span className={styles.eyebrow}>2 minutes · free · no sign-up</span>
          <h1 id="h-intro" className={styles.h1}>Where is your research proposal <span className={styles.mark}>right now</span>?</h1>
          <p className={styles.lede}>Every proposal goes the same way: a topic becomes a question, the question finds a lens, the lens points to a method. Most people stall somewhere along that road, usually without knowing where.</p>
          <p className={styles.lede}>Answer five quick questions about your own idea. You&apos;ll see what you already have and the one next move that gets you unstuck.</p>
          <div className={styles.stack} role="group" aria-label="Which describes you?">
            <button type="button" className={styles.path} onClick={() => choosePath('program')}>
              <strong>I&apos;m working on my thesis or dissertation</strong>
              <span>Master&apos;s or PhD, already in a program</span>
            </button>
            <button type="button" className={styles.path} onClick={() => choosePath('applicant')}>
              <strong>I&apos;m applying and need a research proposal</strong>
              <span>PhD, research Master&apos;s or a scholarship</span>
            </button>
          </div>
          <div className={styles.byline}>
            <span className={styles.av} aria-hidden="true">BK</span>
            <span>Made by Bermet Koshoeva, university lecturer and founder of Methea. The same steps she walks her students through.</span>
          </div>
        </section>
      )}

      {view === 'input' && (
        <section className={styles.stack} aria-labelledby="h-input">
          <span className={styles.eyebrow}>{path === 'applicant' ? 'Your proposal idea' : 'Your thesis idea'}</span>
          <h2 id="h-input" className={styles.h2}>What&apos;s your research about?</h2>
          <p className={styles.lede}>A rough question, a topic, a few words. Whatever you have is a fine place to start.</p>
          <div className={styles.stack}>
            <label htmlFor="rq" className={styles.label}>Your research question or topic</label>
            <textarea id="rq" className={styles.textarea} maxLength={CHECK_QUESTION_MAX} value={rq} onChange={e => setRq(e.target.value)}
              placeholder="e.g. women entrepreneurs in Central Asia and how they test new business ideas" autoFocus />
            <span className={styles.hint}>Nothing is saved or sent while you take the check.</span>
          </div>
          <div className={styles.btnRow}>
            <button type="button" className={styles.primary} onClick={begin}>Continue</button>
            <button type="button" className={styles.ghost} onClick={() => { setRq(''); begin() }}>I only have a vague idea</button>
          </div>
        </section>
      )}

      {view === 'check' && step && (
        <section className={styles.stack} aria-live="polite">
          <Journey path={path} reached={step.reach} current={step.reach} />
          <div className={styles.yourq}><b>Your idea</b>{idea || "A vague idea for now, and that's fine."}</div>
          <div className={styles.card}>
            <span className={styles.eyebrow}>Question {i + 1} of {steps.length}</span>
            <h2 className={styles.h2}>{pick(step.q, path)}</h2>
            {step.example}
            <div className={styles.answers} role="group" aria-label="Your answer">
              {(['yes', 'partly', 'notyet'] as Answer[]).map(a => (
                <button key={a} type="button" aria-pressed={answer === a}
                  onClick={() => setAnswers({ ...answers, [step.id]: a })}>
                  {a === 'yes' ? 'Yes' : a === 'partly' ? 'Partly' : 'Not yet'}
                </button>
              ))}
            </div>
            {answer && (answer === 'yes' ? (
              <div className={`${styles.feedback} ${styles.ok}`}><strong>That piece is in place.</strong><p>{step.yes}</p></div>
            ) : (
              <div className={`${styles.feedback} ${styles.next}`}>
                <strong>{answer === 'partly' ? "You're on your way." : 'Completely normal at this stage.'}</strong>
                <p className={styles.move}>{step.move}</p>
              </div>
            ))}
          </div>
          <div className={styles.btnRow}>
            {answer && <button type="button" className={styles.primary} onClick={next}>{i === steps.length - 1 ? 'See where I am' : 'Next'}</button>}
            <button type="button" className={styles.ghost} onClick={back}>{i === 0 ? 'Edit my idea' : 'Back'}</button>
          </div>
        </section>
      )}

      {view === 'result' && (
        <section className={styles.stack} aria-labelledby="r-title">
          <span className={styles.eyebrow}>Your research, so far</span>
          <Journey path={path} reached={reached} current={stop ? reached : -1} />
          <h1 id="r-title" className={styles.h1}>{result.title}</h1>
          <p className={styles.lede}>{result.body}</p>

          <div className={styles.card}>
            <h3 className={styles.h3}>What you already have</h3>
            <ul className={styles.have}>
              <li>A topic you care about</li>
              {steps.filter(s => answers[s.id] === 'yes').map(s => <li key={s.id}>{pick(s.have, path)}</li>)}
            </ul>
          </div>

          <div className={styles.nextCard}>
            <span className={styles.eyebrow}>Your next step</span>
            <h2 className={styles.h2}>{result.next}</h2>
            <p>{stop ? stop.move : "Write your question, your theory and your method as three short lines. If you can explain how each one leads to the next, you're ready to write."}</p>
            {result.shape && (
              <div className={styles.shape}>A shape that works for many proposals:<br />How do <em>who</em> in <em>where</em> experience <em>one idea</em>?</div>
            )}
            {stop?.read && <a href={READ[stop.read].href}>{READ[stop.read].label}</a>}
          </div>
          {later > 0 && (
            <p className={styles.later}>
              {later === 1
                ? "There is one more piece after this one. One step at a time; you don't need it today."
                : `There are ${later} more pieces after this one. One step at a time; you don't need them all today.`}
            </p>
          )}

          <div className={styles.cta}>
            <h2 className={styles.h2}>{path === 'applicant' ? 'Keep going with your proposal in Methea' : 'Keep going with your idea in Methea'}</h2>
            <p>Methea picks up right where you are. It suggests a sharper version of your question, theories that fit your idea (with real, checked sources), and a method that matches. You stay the author; it walks the road with you.</p>
            <p className={styles.startFrom}>{idea ? `Picking up from: "${idea}"` : 'Picking up from your idea, however rough it is.'}</p>
            <a className={styles.ctaBtn} href="/check/start" onClick={handOver}>
              {path === 'applicant' ? 'Continue my proposal in Methea' : 'Continue my research in Methea'}
            </a>
            <small>Free to start, no card: sharpen your question, find theories that fit, draw your framework. Full methodology, interview guide and export are {priceLabel} per project.</small>
          </div>

          <div className={styles.btnRow}>
            <button type="button" className={styles.ghost} onClick={() => { setRq(''); setAnswers({}); setView('intro') }}>Start again with another idea</button>
          </div>
        </section>
      )}
    </div>
  )
}
