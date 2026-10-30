import { cookies } from 'next/headers'
import Logo from '@/components/ui/Logo'
import ChainDiagram from '@/components/landing/ChainDiagram'
import FrameworkShot from '@/components/landing/FrameworkShot'
import RewriteLoop from '@/components/landing/RewriteLoop'
import { ATTRIBUTION_COOKIE, DEFAULT_ANGLE, parseAngle, sanitizeAttribution, type StartAngle } from '@/lib/funnel-shared'
import { PRICE_VARIANT_COOKIE, parsePriceVariant, priceForVariant } from '@/lib/pricing'
import { MonthlyWaitlistForm, PilotForm, StartViewTracker } from './StartForms'

export const metadata = {
  title: 'Methea — from assignment brief to a methodology that holds together',
  description:
    'For Master’s and PhD students: sharpen your research question, pick a theory that fits, and build the methodology that follows. Methea asks, you decide.',
}

// Copy: docs/landing/start-v2-copy.md. Hero per ?a= angle (the funnel's `angle`).
const HEROES: Record<StartAngle, { h1: string; sub: string }> = {
  question: {
    h1: 'You’ve rewritten your research question five times. The question isn’t the problem.',
    sub: 'The problem is that your question, your theory and your method don’t line up — and nobody ever showed you how to make them.',
  },
  lens: {
    h1: 'Theoretical framework or literature review? If you’re not sure, your supervisor will notice.',
    sub: 'They sound similar. They do completely different jobs. Mixing them up is one of the fastest ways to get a proposal sent back.',
  },
  deadline: {
    h1: 'Proposal due soon, and you still can’t explain why you chose your method?',
    sub: 'That’s the first question your committee will ask. Here’s why it’s so hard to answer — and how to fix it this week.',
  },
}

const AUDIENCE = 'For Master’s and PhD students in the social sciences, education, business and communication.'
const CTA_LABEL = 'Check my research for free'

const TERMS: [string, string][] = [
  ['Literature review', 'what other studies found. It shows the gap.'],
  ['Theoretical framework', 'an existing theory you borrow as a lens. It tells you what to look at.'],
  ['Conceptual framework', 'your own map of how the key concepts in your study connect.'],
  ['Analytical framework', 'how you will turn your data into findings.'],
]

const FIXES: [string, string][] = [
  ['Your supervisor', 'knows exactly what’s wrong, but has many students and very little time for each of them.'],
  ['YouTube and blogs', 'explain each term on its own. None of them look at your topic.'],
  ['ChatGPT', 'writes confident paragraphs that sound right and don’t connect. And many universities now flag AI-written text.'],
]

const STEPS: [string, string][] = [
  ['Describe your topic.', 'A sentence or two, or upload your assignment brief.'],
  ['Sharpen your question.', 'A few focused questions narrow it until it’s researchable.'],
  ['Choose your lens.', 'Methea suggests theories from a curated library and explains why each fits — you decide.'],
  ['Get the chain.', 'A framework diagram, a methodology with the reason behind every choice, and an interview guide where every question maps to a concept in your framework.'],
]

/** The primary call to action, with "no card needed" under it. */
function Cta({ href }: { href: string }) {
  return (
    <div style={s.ctaWrap}>
      <a href={href} style={s.cta}>{CTA_LABEL}</a>
      <span style={s.noCard}>no card needed</span>
    </div>
  )
}

export default function StartPage({ searchParams }: { searchParams: { a?: string } }) {
  // Middleware has already set the cookies for this request (see lib/start-cookies.ts).
  const jar = cookies()
  const attribution = sanitizeAttribution(jar.get(ATTRIBUTION_COOKIE)?.value)
  const angle = parseAngle(searchParams.a) ?? parseAngle(attribution.angle) ?? DEFAULT_ANGLE
  const variant = parsePriceVariant(jar.get(PRICE_VARIANT_COOKIE)?.value) ?? 'B'
  const { label: price } = priceForVariant(variant)
  const hero = HEROES[angle]

  const startHref = '/login'

  const faq = [
    {
      q: 'Is this AI writing my proposal?',
      a: 'No. Methea asks you questions, suggests theories from a curated library with checked citations, and lays out how your framework leads to your methods. You decide, and you write every sentence you submit. It never writes your discussion, conclusion or final report.',
    },
    {
      q: 'Will my university allow it?',
      a: 'Policies differ, so check yours. Methea doesn’t produce text you hand in — it works like a structured planning tool, and you can show your supervisor exactly what it did and why.',
    },
    {
      q: 'What if my field isn’t covered?',
      a: 'Methea is built for the social sciences, education, business and communication, mostly qualitative and mixed-methods research. If the theory you need isn’t in the library, you can add your own and Methea checks its citation where it can. If your project is mainly quantitative or outside these fields, it may not fit well yet.',
    },
    {
      q: 'What do I get for free?',
      a: 'Brief upload, research-question refinement, theory suggestions and your framework diagram, with a watermarked export. No card needed.',
    },
    {
      q: 'Refunds?',
      a: '14-day money-back guarantee: within 14 days of your purchase you can get a full refund, no questions asked, even if you’ve already used the paid features.',
      terms: true,
    },
  ]

  return (
    <main style={s.page}>
      <StartViewTracker props={{ ...attribution, angle, price_variant: variant }} />
      <div style={s.container}>
        <header style={s.header}>
          <Logo size="sm" />
          <a href="/login" style={s.signIn}>Sign in</a>
        </header>

        {/* 1. Hero */}
        <section style={s.hero}>
          <h1 style={s.h1}>{hero.h1}</h1>
          <p style={s.sub}>{hero.sub}</p>
          <Cta href={startHref} />
          <p style={s.audience}>{AUDIENCE}</p>
        </section>

        {/* 2. The loop */}
        <section style={s.section}>
          <h2 style={s.h2}>Does this sound familiar?</h2>
          <p style={s.p}>
            You pick a topic you care about. You write a research question. Your supervisor says it’s
            “too broad”. You narrow it. Now it’s “not researchable”. You add a theory because the template
            says you need one. Then someone asks: “How does this theory shape your interview questions?” —
            and you realise it doesn’t.
          </p>
          <p style={s.p}>So you start again.</p>
          <RewriteLoop />
          <p style={s.p}>
            One research methods instructor we interviewed told us her Master’s students spend 4–5 weeks and
            up to 8–9 rewrites just to define what they’re researching. Not collecting data. Not writing.
            Just figuring out what the study is.
          </p>
          <p style={s.p}>
            If you’re stuck in that loop, it’s not because you’re a weak student. It’s because nobody
            teaches the part that matters most.
          </p>
        </section>

        {/* 3. The vocabulary trap */}
        <section style={s.section}>
          <h2 style={s.h2}>Four terms. Ten different definitions online.</h2>
          <p style={s.p}>
            Your template asks for a theoretical framework. A YouTube video talks about a conceptual
            framework. Your supervisor mentions an analytical framework. And half of what you’ve written so
            far is actually a literature review.
          </p>
          <p style={s.p}>Here’s the short version nobody gives you:</p>
          <ul style={s.list}>
            {TERMS.map(([term, rest]) => (
              <li key={term} style={s.li}><strong style={s.lead}>{term}</strong> — {rest}</li>
            ))}
          </ul>
          <p style={s.p}>
            Knowing the definitions is the easy part. Making all four point in the same direction is where
            proposals fall apart.
          </p>
        </section>

        {/* 4. The chain */}
        <section style={s.section}>
          <h2 style={s.h2}>It’s not your writing. It’s the chain.</h2>
          <p style={s.p}>Every solid study is a chain:</p>
          <p style={s.chainLine}>
            question → theoretical lens → concepts → method → the questions you ask → how you analyse the answers.
          </p>
          <ChainDiagram />
          <p style={s.p}>
            Each link has to follow from the one before. When one link is off, everything after it is off
            too — and each part can still look fine on its own. That’s why the feedback feels vague: “it
            doesn’t hang together”, “where does the theory come in?”, “why interviews?”.
          </p>
          <a href={startHref} style={s.cta}>Check if my chain holds — free</a>
        </section>

        {/* 5. Why the usual fixes don't work */}
        <section style={s.section}>
          <h2 style={s.h2}>You’ve probably tried these already.</h2>
          <ul style={s.list}>
            {FIXES.map(([who, rest]) => (
              <li key={who} style={s.li}><strong style={s.lead}>{who}</strong> — {rest}</li>
            ))}
          </ul>
          <p style={s.p}>
            What’s missing is someone who walks through your study, link by link, and makes you explain
            each choice.
          </p>
        </section>

        {/* 6. What it costs you to leave it */}
        <section style={s.section}>
          <h2 style={s.h2}>The chain doesn’t break at the proposal. It breaks later.</h2>
          <p style={s.p}>
            A loose chain survives the proposal stage more often than you’d think. It breaks when you sit
            down with 15 interview transcripts and realise your questions didn’t ask about the things your
            theory says matter. Or at your defence, when someone asks “why this theory and not another?”
          </p>
          <p style={s.p}>
            At that point, fixing it means redoing data collection. Fixing it now is a matter of hours.
          </p>
        </section>

        {/* 7. Meet Methea */}
        <section style={s.section}>
          <h2 style={s.h2}>Methea walks you through the chain, one link at a time.</h2>
          <p style={s.p}>
            It’s a research-methods navigator. You bring your topic; Methea asks the questions a good
            supervisor would ask, and won’t let you move on until each link holds.
          </p>
          <ol style={s.steps}>
            {STEPS.map(([lead, rest], i) => (
              <li key={lead} style={s.step}>
                <span style={s.stepNum}>{i + 1}</span>
                <span style={s.li}><strong style={s.lead}>{lead}</strong> {rest}</span>
              </li>
            ))}
          </ol>
          <FrameworkShot />
        </section>

        {/* 8. Not an AI writer */}
        <section style={s.section}>
          <h2 style={s.h2}>It asks. You decide. You write.</h2>
          <p style={s.p}>
            Methea never writes text you’d submit — no essay paragraphs, no discussion, no conclusion. What
            you get is the structure behind your thinking and the reason for every step. Safe to show your
            supervisor. Built to help you defend your study, not to write it for you.
          </p>
        </section>

        {/* 9. Price, guarantee, CTA */}
        <section style={s.section}>
          <h2 style={s.h2}>Start free. Pay only when it’s working for you.</h2>
          <div style={s.priceCard}>
            <p style={s.p}>
              <strong style={s.lead}>Free:</strong> describe your topic, sharpen your question, get theory
              suggestions and your framework diagram.
            </p>
            <p style={s.p}>
              <strong style={s.lead}>{price} per project, one-time:</strong> full framework with verified
              citations, methodology chain, interview guide, transcript analysis, full export. 6 months of
              access. No subscription.
            </p>
            <p style={s.guarantee}>
              14-day money-back guarantee. If it doesn’t help, email us and you get your money back.
            </p>
            <Cta href={startHref} />
          </div>
          <MonthlyWaitlistForm />
          <PilotForm />
        </section>

        {/* 10. FAQ */}
        <section style={s.section}>
          <h2 style={s.h2}>Questions</h2>
          {faq.map(item => (
            <details key={item.q} style={s.faq}>
              <summary style={s.faqQ}>{item.q}</summary>
              <p style={s.faqA}>
                {item.a}
                {item.terms && <> <a href="/terms" style={s.inlineLink}>Terms</a></>}
              </p>
            </details>
          ))}
        </section>

        {/* Final CTA */}
        <section style={{ ...s.section, ...s.final }}>
          <h2 style={s.h2}>Bring your topic. Leave with a study that holds together.</h2>
          <Cta href={startHref} />
        </section>

        <footer style={s.footer}>
          <a href="/terms" style={s.footLink}>Terms</a>
          <a href="/privacy" style={s.footLink}>Privacy</a>
        </footer>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', background: 'var(--paper)', padding: '1.25rem 1rem 3rem' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.75rem' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  signIn:    { fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none' },

  hero:      { display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' },
  h1:        { fontSize: 'clamp(1.75rem, 7vw, 2.5rem)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.025em', color: 'var(--ink)' },
  sub:       { fontSize: '1.0625rem', lineHeight: 1.6, color: 'var(--graphite)' },
  ctaWrap:   { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.375rem' },
  cta:       { alignSelf: 'flex-start', padding: '0.875rem 1.5rem', background: 'var(--ink)', color: 'var(--sheet)', borderRadius: 'var(--radius)', fontSize: '1rem', fontWeight: 700, textDecoration: 'none' },
  noCard:    { fontSize: '0.8125rem', color: 'var(--pencil)', paddingLeft: '0.25rem' },
  audience:  { fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--graphite)' },

  section:   { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  h2:        { fontSize: 'clamp(1.375rem, 5vw, 1.75rem)', fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.015em', color: 'var(--ink)' },
  p:         { fontSize: '1rem', lineHeight: 1.65, color: 'var(--graphite)' },
  chainLine: { fontSize: '1rem', lineHeight: 1.65, fontWeight: 600, color: 'var(--ink-blue)' },
  lead:      { fontWeight: 600, color: 'var(--ink)' },

  list:      { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' },
  li:        { fontSize: '1rem', lineHeight: 1.6, color: 'var(--graphite)' },

  steps:     { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  step:      { display: 'flex', alignItems: 'flex-start', gap: '0.625rem' },
  stepNum:   { flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--marker-yellow)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--ink)' },

  priceCard: { padding: '1.25rem', background: 'var(--sheet)', border: '1px solid var(--ink)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  guarantee: { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.25rem' },
  inlineLink:{ color: 'var(--ink-blue)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' },

  faq:       { borderTop: '1px solid var(--stone-soft)', padding: '0.875rem 0' },
  faqQ:      { fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' },
  faqA:      { fontSize: '0.9375rem', lineHeight: 1.65, color: 'var(--graphite)', marginTop: '0.5rem' },

  final:     { padding: '1.5rem 1.25rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  footer:    { display: 'flex', gap: '1.25rem', fontSize: '0.8125rem' },
  footLink:  { color: 'var(--graphite)', textDecoration: 'underline', textUnderlineOffset: '2px' },
}
