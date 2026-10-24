import Image from 'next/image'
import { cookies } from 'next/headers'
import Logo from '@/components/ui/Logo'
import { ATTRIBUTION_COOKIE, DEFAULT_ANGLE, parseAngle, sanitizeAttribution, type StartAngle } from '@/lib/funnel-shared'
import { PRICE_VARIANT_COOKIE, parsePriceVariant, priceForVariant } from '@/lib/pricing'
import { MonthlyWaitlistForm, PilotForm, StartViewTracker } from './StartForms'

export const metadata = {
  title: 'Methea — from assignment brief to a methodology that holds together',
  description:
    'For Master’s and PhD students: sharpen your research question, pick a theory that fits, and build the methodology that follows. Methea asks, you decide.',
}

// Hero copy per ?a= angle (the funnel's `angle`).
const HEROES: Record<StartAngle, { h1: string; sub: string }> = {
  question: {
    h1: 'Your supervisor says your research question is too broad.',
    sub: 'Methea helps you sharpen it, pick a theory that actually fits, and build a methodology that follows from both — before your next meeting.',
  },
  lens: {
    h1: 'Theoretical framework or literature review? Most proposals mix them up.',
    sub: 'Methea walks you from your brief to a framework that does real work: it shapes your questions and your analysis.',
  },
  deadline: {
    h1: 'From assignment brief to a methodology your supervisor can sign off — in one evening.',
    sub: 'Upload your brief. Methea asks the right questions, matches theories to your question, and builds the chain from framework to interview guide.',
  },
}

const AUDIENCE =
  'For Master’s and PhD students in the social sciences, education, business and communication — qualitative and mixed-methods research.'

const STEPS = [
  {
    img: '/start/step1.png',
    title: 'Upload your brief',
    text: 'Start from what you already have: your assignment brief or proposal outline, plus your reading list if you have one.',
  },
  {
    img: '/start/step2.png',
    title: 'Sharpen your question, pick a theory',
    text: 'A few focused questions narrow your research question. Methea suggests theories from a curated library and explains why each one fits — you choose.',
  },
  {
    img: '/start/step3.png',
    title: 'Get the chain',
    text: 'A framework diagram, a methodology with the reason for every choice, and an interview guide where each question maps to a concept in your framework.',
  },
]

const FREE = ['Brief upload', 'Research-question refinement', 'Theory suggestions', 'Framework diagram (watermarked export)']
const PAID = [
  'Full framework narrative with verified citations',
  'Methodology chain',
  'Interview guide',
  'Transcript analysis',
  'Full export, no watermark',
]

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

        {/* Hero */}
        <section style={s.hero}>
          <h1 style={s.h1}>{hero.h1}</h1>
          <p style={s.sub}>{hero.sub}</p>
          <a href={startHref} style={s.cta}>Start free — no card</a>
          <p style={s.audience}>{AUDIENCE}</p>
        </section>

        {/* 1. Problem */}
        <section style={s.section}>
          <h2 style={s.h2}>Why proposals come back</h2>
          <p style={s.p}>
            Not because of the writing. The #1 reason is that the research question, the theory and the
            methods don’t line up: the theory doesn’t shape the questions you ask, and the method doesn’t
            follow from the framework. Each part can look fine on its own — together they don’t hold.
          </p>
        </section>

        {/* 2. How it works */}
        <section style={s.section}>
          <h2 style={s.h2}>How it works</h2>
          <ol style={s.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} style={s.step}>
                <p style={s.stepTitle}><span style={s.stepNum}>{i + 1}</span>{step.title}</p>
                <p style={s.p}>{step.text}</p>
                <Image
                  src={step.img}
                  alt={`Methea — step ${i + 1}: ${step.title}`}
                  width={960}
                  height={600}
                  sizes="(max-width: 720px) 100vw, 688px"
                  style={s.shot}
                />
              </li>
            ))}
          </ol>
        </section>

        {/* 3. Not an AI writer */}
        <section style={s.section}>
          <h2 style={s.h2}>Not an AI writer</h2>
          <p style={s.p}>
            Methea asks, you decide. It never writes text you’d submit — no essay paragraphs, no
            discussion, no conclusion. What you get is the structure behind your thinking, with the reason
            for every step. Safe to show your supervisor.
          </p>
        </section>

        {/* 4. Free vs paid */}
        <section style={s.section}>
          <h2 style={s.h2}>Free vs paid</h2>
          <div style={s.compare}>
            <div style={s.plan}>
              <p style={s.planName}>Free</p>
              <ul style={s.list}>{FREE.map(f => <li key={f} style={s.li}>✓ {f}</li>)}</ul>
            </div>
            <div style={{ ...s.plan, ...s.planPaid }}>
              <p style={s.planName}>Paid — everything in Free, plus</p>
              <ul style={s.list}>{PAID.map(f => <li key={f} style={s.li}>✓ {f}</li>)}</ul>
            </div>
          </div>
        </section>

        {/* 5. Price */}
        <section style={s.section}>
          <h2 style={s.h2}>Price</h2>
          <div style={s.priceCard}>
            <p style={s.price}>{price}</p>
            <p style={s.priceNote}>one-time, per project · 6 months of full access</p>
            <p style={s.guarantee}>
              14-day money-back guarantee — <a href="/terms" style={s.inlineLink}>see the Terms</a>
            </p>
            <a href={startHref} style={s.cta}>Start free — no card</a>
          </div>
          <MonthlyWaitlistForm />
          <PilotForm />
        </section>

        {/* 6. Founder */}
        <section style={s.section}>
          <h2 style={s.h2}>Who’s behind it</h2>
          <p style={s.p}>
            <strong>Bermet Koshoeva</strong> — Erasmus Mundus joint Master’s (Copenhagen &amp; Montpellier),
            teaches at the American University of Central Asia.
          </p>
        </section>

        {/* 7. FAQ */}
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

        {/* 8. Final CTA */}
        <section style={{ ...s.section, ...s.final }}>
          <h2 style={s.h2}>Bring your brief. Leave with a plan that holds together.</h2>
          <a href={startHref} style={s.cta}>Start free — no card</a>
          <p style={s.audience}>{AUDIENCE}</p>
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
  cta:       { alignSelf: 'flex-start', padding: '0.875rem 1.5rem', background: 'var(--ink)', color: 'var(--sheet)', borderRadius: 'var(--radius)', fontSize: '1rem', fontWeight: 700, textDecoration: 'none' },
  audience:  { fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--graphite)' },

  section:   { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  h2:        { fontSize: 'clamp(1.375rem, 5vw, 1.75rem)', fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.015em', color: 'var(--ink)' },
  p:         { fontSize: '1rem', lineHeight: 1.65, color: 'var(--graphite)' },

  steps:     { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.75rem' },
  step:      { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  stepTitle: { fontSize: '1.0625rem', fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  stepNum:   { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--marker-yellow)', fontSize: '0.875rem', fontWeight: 700 },
  shot:      { width: '100%', height: 'auto', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },

  compare:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.875rem' },
  plan:      { padding: '1.125rem 1.25rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  planPaid:  { borderColor: 'var(--ink)' },
  planName:  { fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.5rem' },
  list:      { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  li:        { fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--graphite)' },

  priceCard: { padding: '1.25rem', background: 'var(--sheet)', border: '1px solid var(--ink)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  price:     { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.5rem', lineHeight: 1, color: 'var(--ink)' },
  priceNote: { fontSize: '0.9375rem', color: 'var(--graphite)' },
  guarantee: { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem' },
  inlineLink:{ color: 'var(--ink-blue)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' },

  faq:       { borderTop: '1px solid var(--stone-soft)', padding: '0.875rem 0' },
  faqQ:      { fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' },
  faqA:      { fontSize: '0.9375rem', lineHeight: 1.65, color: 'var(--graphite)', marginTop: '0.5rem' },

  final:     { padding: '1.5rem 1.25rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  footer:    { display: 'flex', gap: '1.25rem', fontSize: '0.8125rem' },
  footLink:  { color: 'var(--graphite)', textDecoration: 'underline', textUnderlineOffset: '2px' },
}
