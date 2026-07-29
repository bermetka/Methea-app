import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Methea — Your research, methodically.',
  description:
    'Methea guides Masters and PhD students from assignment brief to structured research findings. Framework selection, methodology, interview guides, and analysis — all anchored to your research question.',
}

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/projects')

  return (
    <div style={s.root}>

      {/* ── Nav ── */}
      <nav style={s.nav}>
        <span style={s.wordmark}>Methea</span>
        <a href="/login" style={s.navCta}>Sign in →</a>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroBadge}>For Masters &amp; PhD students</div>
          <h1 style={s.heroHeading}>
            Fix the question<br />
            before it&apos;s<br />
            <span style={s.heroAccent}>asked.</span>
          </h1>
          <p style={s.heroSub}>
            Methea sharpens your research question with Socratic gates, then
            builds the framework and methodology around it — so your research
            survives interrogation, before two years are sunk into the wrong
            question. You bring the thinking. Methea asks the right questions.
          </p>
          <div style={s.heroCtas}>
            <a href="/login" style={s.primaryCta}>Try it free →</a>
            <a href="#how-it-works" style={s.secondaryCta}>See how it works</a>
          </div>
          <p style={s.heroNote}>Free to start · No credit card required</p>
        </div>

        {/* Decorative marker underline */}
        <div style={s.heroMarker} />
      </section>

      {/* ── The Socratic gate (moat) ── */}
      <section style={s.gate}>
        <div style={s.gateInner}>
          <div style={s.gateHead}>
            <p style={s.sectionEyebrow}>The Socratic gate</p>
            <h2 style={s.sectionHeading}>The tool that asks<br />instead of answers</h2>
            <p style={s.sectionSub}>
              Methea never hands you an answer. At key moments it asks a sharp
              question drawn from your own brief — with reasoned options, each
              tied to a method. You choose, and you stay the author. This is the
              engine competitors can&apos;t copy.
            </p>
          </div>

          <div style={s.gateCard}>
            <p style={s.gateEyebrow}>Based on your brief</p>
            <p style={s.gateQuestion}>
              Your question asks <em>how</em> policies get translated — do you
              want to interpret the meaning, or trace the changes over time?
            </p>
            <div style={s.gateOptions}>
              {[
                { label: 'Meaning & logic', why: '→ interpretive methods · discourse analysis' },
                { label: 'Trace the changes', why: '→ historical-comparative · document analysis' },
                { label: 'Both mechanisms and meaning', why: '→ mixed design · documents + elite interviews' },
              ].map(o => (
                <div key={o.label} style={s.gateOption}>
                  <span style={s.gateOptionBar} />
                  <div>
                    <p style={s.gateOptionLabel}>{o.label}</p>
                    <p style={s.gateOptionWhy}>{o.why}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={s.gateFooter}>
              Methea surfaces the question.{' '}
              <span style={s.gateFooterAccent}>You decide — and stay the author.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── The line we never cross ── */}
      <section style={s.lineSection}>
        <div style={s.lineInner}>
          <div style={s.lineCard}>
            <div style={s.lineCol}>
              <p style={s.lineLabel}>Methea does</p>
              <ul style={s.lineList}>
                {[
                  'Suggests theories from a curated library',
                  'Builds your conceptual framework',
                  'Recommends a methodology chain with reasoning',
                  'Generates interview questions anchored to your framework',
                  'Codes transcripts and surfaces themes',
                  'Exports an annotated research scaffold',
                ].map(item => (
                  <li key={item} style={s.lineItem}>
                    <span style={s.checkDot}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div style={s.lineDivider} />
            <div style={s.lineCol}>
              <p style={s.lineLabel}>You write</p>
              <ul style={s.lineList}>
                {[
                  'Your discussion chapter',
                  'Your conclusion',
                  'Your final report',
                  'Your interpretation of findings',
                  'Your argument and voice',
                ].map(item => (
                  <li key={item} style={s.lineItem}>
                    <span style={s.penDot}>✎</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p style={s.lineCaption}>
            This distinction is what makes Methea a tool universities recommend instead of ban.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={s.steps}>
        <div style={s.stepsInner}>
          <p style={s.sectionEyebrow}>How it works</p>
          <h2 style={s.sectionHeading}>Three layers, one research thread</h2>
          <p style={s.sectionSub}>
            Every block builds on what came before. Change a theory and your methodology updates. Change a framework concept and your interview questions update.
          </p>

          <div style={s.stepGrid}>
            {[
              {
                num: '01',
                color: 'var(--marker-lime)',
                title: 'Plan',
                desc: 'Upload your brief. Methea suggests theories, builds your conceptual framework, and derives a complete methodology chain — each step with a plain-English "why."',
                items: ['Theory discovery (40-theory library)', 'Framework builder', 'Methodology chain', 'Socratic clarification gate'],
              },
              {
                num: '02',
                color: 'var(--marker-yellow)',
                title: 'Collect',
                desc: 'Generate an interview guide anchored to your exact framework concepts. Every question is tagged to the theory it probes.',
                items: ['10–15 interview questions', 'Each question tagged to framework', 'Export to Word'],
              },
              {
                num: '03',
                color: 'var(--sky)',
                title: 'Analyse',
                desc: 'Upload transcripts. Methea codes them against your framework, surfaces themes, and gives you a structured findings scaffold — you interpret, not the AI.',
                items: ['Deductive + inductive coding', 'Theme synthesis', 'Verbatim quote evidence', 'Student validates themes (Gate 3)'],
              },
            ].map(step => (
              <div key={step.num} style={s.stepCard}>
                <div style={{ ...s.stepNum, background: step.color }}>{step.num}</div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepDesc}>{step.desc}</p>
                <ul style={s.stepItems}>
                  {step.items.map(item => (
                    <li key={item} style={s.stepItem}>
                      <span style={s.stepDot} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For professors ── */}
      <section style={s.profs}>
        <div style={s.profsInner}>
          <p style={s.sectionEyebrow}>For supervisors &amp; institutions</p>
          <h2 style={s.sectionHeading}>Built to complement your teaching,<br />not replace your student's thinking</h2>
          <div style={s.profsGrid}>
            {[
              {
                icon: '🔒',
                title: 'Citation-verified only',
                desc: 'Every theory in Methea\'s library is from a curated, verified set. The AI never invents authors, titles, or DOIs — OpenAlex verification runs on every citation before the student sees it.',
              },
              {
                icon: '🎓',
                title: 'Scaffolds, never ghostwrites',
                desc: 'Methea exports annotated scaffolds with placeholder prompts, not polished prose. The student fills in the analysis, interpretation, and argument — that\'s non-negotiable.',
              },
              {
                icon: '🔗',
                title: 'Every step stays connected',
                desc: 'Framework concepts drive interview questions drive coding categories drive findings. The thread from brief to analysis is visible and traceable — useful for supervision conversations.',
              },
            ].map(card => (
              <div key={card.title} style={s.profCard}>
                <span style={s.profIcon}>{card.icon}</span>
                <h3 style={s.profTitle}>{card.title}</h3>
                <p style={s.profDesc}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={s.pricing}>
        <div style={s.pricingInner}>
          <p style={s.sectionEyebrow}>Pricing</p>
          <h2 style={s.sectionHeading}>Students think in projects, not subscriptions</h2>
          <div style={s.pricingGrid}>
            <div style={s.pricingCard}>
              <p style={s.planName}>Free</p>
              <p style={s.planPrice}>$0</p>
              <p style={s.planNote}>Always free</p>
              <ul style={s.planItems}>
                {['1 project', 'Full framework builder', 'Methodology chain', 'Education layer (all glossary + reasoning)', 'View everything in-app'].map(i => (
                  <li key={i} style={s.planItem}><span style={s.planCheck}>✓</span>{i}</li>
                ))}
                <li style={{ ...s.planItem, color: 'var(--pencil)' }}><span style={s.planX}>–</span>Export</li>
              </ul>
              <a href="/login" style={s.planCta}>Start free →</a>
            </div>

            <div style={{ ...s.pricingCard, ...s.pricingCardFeatured }}>
              <p style={s.planBadge}>Most popular</p>
              <p style={s.planName}>Project</p>
              <p style={s.planPrice}>$49</p>
              <p style={s.planNote}>One-time · valid until you're done</p>
              <ul style={s.planItems}>
                {['Everything in Free', 'Unlimited exports', '5 transcript analyses', 'Interview guide export', 'Full findings scaffold', 'Valid for one project'].map(i => (
                  <li key={i} style={s.planItem}><span style={{ ...s.planCheck, color: 'var(--moss)' }}>✓</span>{i}</li>
                ))}
              </ul>
              <a href="/login" style={{ ...s.planCta, ...s.planCtaFeatured }}>Get started →</a>
            </div>

            <div style={s.pricingCard}>
              <p style={s.planName}>Researcher</p>
              <p style={s.planPrice}>$19<span style={s.planPer}>/mo</span></p>
              <p style={s.planNote}>Unlimited projects</p>
              <ul style={s.planItems}>
                {['Everything in Project', 'Unlimited projects', 'Unlimited transcripts', 'Priority support'].map(i => (
                  <li key={i} style={s.planItem}><span style={s.planCheck}>✓</span>{i}</li>
                ))}
              </ul>
              <a href="/login" style={s.planCta}>Start free →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={s.finalCta}>
        <div style={s.finalInner}>
          <h2 style={s.finalHeading}>Your research, methodically.</h2>
          <p style={s.finalSub}>Start with your brief. Methea handles the rest of the structure.</p>
          <a href="/login" style={s.finalBtn}>Try Methea free →</a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <span style={s.footerWordmark}>Methea</span>
          <p style={s.footerTagline}>Your research, methodically.</p>
          <p style={s.footerNote}>
            Methea is a thinking tool, not a writing tool. Students remain the authors of their own research.
          </p>
          <div style={s.footerLinks}>
            <a href="/privacy" style={s.footerLink}>Privacy</a>
            <span style={s.footerDot}>·</span>
            <a href="/terms" style={s.footerLink}>Terms</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root:   { minHeight: '100vh', background: 'var(--paper)', overflowX: 'hidden' },

  // Nav
  nav:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', maxWidth: '1000px', margin: '0 auto' },
  wordmark: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--ink)' },
  navCta: { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none' },

  // Hero
  hero:       { padding: '4rem 1.5rem 5rem', maxWidth: '1000px', margin: '0 auto', position: 'relative' as const },
  heroInner:  { maxWidth: '680px' },
  heroBadge:  { display: 'inline-block', padding: '3px 12px', background: 'var(--marker-lime)', color: 'var(--ink)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' },
  heroHeading:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.25rem, 6vw, 3.75rem)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.025em', color: 'var(--ink)', marginBottom: '1.25rem' },
  heroAccent: { color: 'var(--ink-blue)' },
  heroSub:    { fontSize: 'clamp(1rem, 2vw, 1.125rem)', color: 'var(--graphite)', lineHeight: 1.65, maxWidth: '540px', marginBottom: '2rem' },
  heroCtas:   { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' as const, marginBottom: '1rem' },
  primaryCta: { display: 'inline-block', padding: '0.75rem 1.5rem', background: 'var(--ink)', color: 'var(--sheet)', borderRadius: 'var(--radius)', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.01em' },
  secondaryCta:{ display: 'inline-block', padding: '0.75rem 1.25rem', color: 'var(--graphite)', fontSize: '0.9375rem', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid var(--stone)' },
  heroNote:   { fontSize: '0.8125rem', color: 'var(--pencil)' },
  heroMarker: { position: 'absolute' as const, bottom: '2rem', right: '2rem', width: '180px', height: '8px', background: 'var(--marker-lime)', borderRadius: '4px', opacity: 0.6 },

  // Socratic gate
  gate:        { padding: '4rem 1.5rem 5rem', maxWidth: '1000px', margin: '0 auto' },
  gateInner:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem', alignItems: 'start' },
  gateHead:    { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  gateCard:    { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column' as const, gap: '1.125rem' },
  gateEyebrow: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--moss)' },
  gateQuestion:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.0625rem, 2.4vw, 1.3125rem)', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.35 },
  gateOptions: { display: 'flex', flexDirection: 'column' as const, gap: '0.625rem' },
  gateOption:  { position: 'relative' as const, display: 'flex', background: 'var(--paper)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem 0.75rem 1.125rem', overflow: 'hidden' },
  gateOptionBar:{ position: 'absolute' as const, left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--marker-lime)' },
  gateOptionLabel:{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.125rem' },
  gateOptionWhy:{ fontSize: '0.8125rem', color: 'var(--moss)', lineHeight: 1.4 },
  gateFooter:  { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.9375rem', color: 'var(--graphite)', borderTop: '1px solid var(--stone-soft)', paddingTop: '1rem', lineHeight: 1.5 },
  gateFooterAccent:{ color: 'var(--moss)', fontStyle: 'italic' },

  // Line section
  lineSection:{ background: 'var(--sheet)', borderTop: '1px solid var(--stone-soft)', borderBottom: '1px solid var(--stone-soft)', padding: '3.5rem 1.5rem' },
  lineInner:  { maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '1.5rem' },
  lineCard:   { display: 'flex', gap: '0', background: 'var(--paper)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  lineCol:    { flex: 1, padding: '1.75rem 2rem' },
  lineDivider:{ width: '1px', background: 'var(--stone-soft)', flexShrink: 0 },
  lineLabel:  { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pencil)', marginBottom: '1rem' },
  lineList:   { listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: '0.625rem' },
  lineItem:   { display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.5 },
  checkDot:   { flexShrink: 0, fontWeight: 700, color: 'var(--moss)', fontSize: '0.875rem', marginTop: '0.1rem' },
  penDot:     { flexShrink: 0, fontWeight: 700, color: 'var(--ink-blue)', fontSize: '0.875rem', marginTop: '0.1rem' },
  lineCaption:{ fontSize: '0.875rem', color: 'var(--pencil)', textAlign: 'center' as const, fontStyle: 'italic' },

  // Steps
  steps:      { padding: '5rem 1.5rem', maxWidth: '1000px', margin: '0 auto' },
  stepsInner: { display: 'flex', flexDirection: 'column' as const, gap: '3rem' },
  sectionEyebrow:{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pencil)' },
  sectionHeading:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.2 },
  sectionSub: { fontSize: '1rem', color: 'var(--graphite)', lineHeight: 1.65, maxWidth: '580px' },
  stepGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' },
  stepCard:   { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column' as const, gap: '0.875rem' },
  stepNum:    { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: 'var(--radius)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--ink)', letterSpacing: '0.05em', flexShrink: 0 },
  stepTitle:  { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)' },
  stepDesc:   { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.65 },
  stepItems:  { listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginTop: '0.25rem' },
  stepItem:   { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--graphite)' },
  stepDot:    { width: '5px', height: '5px', borderRadius: '50%', background: 'var(--stone)', flexShrink: 0 },

  // Professors
  profs:      { background: 'var(--ink)', padding: '5rem 1.5rem' },
  profsInner: { maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '3rem' },
  profsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' },
  profCard:   { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  profIcon:   { fontSize: '1.5rem' },
  profTitle:  { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.125rem', fontWeight: 600, color: 'var(--sheet)', lineHeight: 1.3 },
  profDesc:   { fontSize: '0.9375rem', color: '#B0ADA6', lineHeight: 1.65 },

  // Override eyebrow + heading for dark section
  // (these are re-used from sectionEyebrow/sectionHeading but with light colors — handled inline below)

  // Pricing
  pricing:     { padding: '5rem 1.5rem', background: 'var(--paper)' },
  pricingInner:{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '3rem' },
  pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'start' },
  pricingCard: { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  pricingCardFeatured: { border: '2px solid var(--ink)', position: 'relative' as const },
  planBadge:   { position: 'absolute' as const, top: '-12px', left: '1.25rem', background: 'var(--marker-lime)', color: 'var(--ink)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 'var(--radius-sm)' },
  planName:    { fontSize: '0.875rem', fontWeight: 700, color: 'var(--pencil)', letterSpacing: '0.06em', textTransform: 'uppercase' as const },
  planPrice:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.25rem', fontWeight: 400, color: 'var(--ink)', lineHeight: 1 },
  planPer:     { fontSize: '1rem', color: 'var(--graphite)' },
  planNote:    { fontSize: '0.8125rem', color: 'var(--pencil)', marginTop: '-0.5rem' },
  planItems:   { listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', flex: 1 },
  planItem:    { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--graphite)', lineHeight: 1.5 },
  planCheck:   { flexShrink: 0, fontWeight: 700, color: 'var(--graphite)', marginTop: '0.1rem' },
  planX:       { flexShrink: 0, color: 'var(--stone)', marginTop: '0.1rem' },
  planCta:     { display: 'block', textAlign: 'center' as const, padding: '0.625rem 1rem', border: '1px solid var(--stone)', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', textDecoration: 'none', marginTop: 'auto' },
  planCtaFeatured: { background: 'var(--ink)', color: 'var(--sheet)', border: 'none' },

  // Final CTA
  finalCta:   { background: 'var(--marker-lime)', padding: '5rem 1.5rem', textAlign: 'center' as const },
  finalInner: { maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1.25rem' },
  finalHeading:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1.15 },
  finalSub:   { fontSize: '1rem', color: 'var(--graphite)', lineHeight: 1.65 },
  finalBtn:   { display: 'inline-block', padding: '0.875rem 2rem', background: 'var(--ink)', color: 'var(--sheet)', borderRadius: 'var(--radius)', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.01em' },

  // Footer
  footer:     { background: 'var(--ink)', padding: '2.5rem 1.5rem' },
  footerInner:{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  footerWordmark:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--sheet)' },
  footerTagline:{ fontSize: '0.875rem', color: '#B0ADA6' },
  footerNote: { fontSize: '0.8125rem', color: '#706D66', maxWidth: '480px', lineHeight: 1.6, marginTop: '0.5rem' },
  footerLinks:{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' },
  footerLink: { fontSize: '0.8125rem', color: '#B0ADA6' },
  footerDot:  { fontSize: '0.8125rem', color: '#706D66' },
}
