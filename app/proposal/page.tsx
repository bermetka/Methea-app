import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import ChainDiagram from '@/components/landing/ChainDiagram'
import CookieSettingsLink, { CookieSettingsDot } from '@/components/consent/CookieSettingsLink'
import { ATTRIBUTION_COOKIE, sanitizeAttribution } from '@/lib/funnel-shared'
import { priceLabel } from '@/lib/pricing'
import { StartViewTracker } from '../start/StartForms'
import TopicForm from './TopicForm'
import StickyCta from './StickyCta'
import styles from './proposal.module.css'

const DESCRIPTION =
  'Your research proposal is due. Line up your question, theory and method tonight — Methea asks the questions your supervisor would ask. You decide. You write.'

export const metadata: Metadata = {
  title: 'Get your research proposal to hold together | Methea',
  description: DESCRIPTION,
  alternates: { canonical: '/proposal' },
  openGraph: { type: 'website', url: '/proposal', title: 'Your research proposal is due.', description: DESCRIPTION, siteName: 'Methea' },
}

// Proposal-angle sales page for paid creatives (copy approved 2026-11-17).
// Layout and type follow /check. Both topic forms hand over to /check/start → brief (Gate 1).
const LIBRARY = '150+'

const FAQ = [
  ['My proposal is due in a few days. Is that enough?', 'The free part takes one sitting: your topic, a sharper question, theories that fit and your framework diagram. It won’t guarantee approval — it makes sure the parts of your study fit together before you write them up.'],
  ['Is this AI writing my proposal?', 'No. Methea asks you questions, suggests theories from a curated library with checked citations, and lays out how your framework leads to your methods. You decide, and you write every sentence you submit.'],
  ['Will my university allow it?', 'Policies differ, so check yours. Methea doesn’t produce text you hand in — it works like a structured planning tool, and you can show your supervisor exactly what it did and why.'],
  ['What if my field isn’t covered?', 'Methea is built for the social sciences, education, business and communication, mostly qualitative and mixed-methods research. If the theory you need isn’t in the library, you can add your own.'],
  ['Refunds?', '14-day money-back guarantee on a paid project, even if you’ve already used the paid features.'],
]

export default function ProposalPage() {
  const attribution = sanitizeAttribution(cookies().get(ATTRIBUTION_COOKIE)?.value)
  const price = priceLabel(process.env.NEXT_PUBLIC_PRICE_LABEL_A) || '$49'

  return (
    <div className={styles.root}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap" />
      <StartViewTracker props={{ ...attribution, angle: 'proposal' }} />

      <nav className={styles.nav} aria-label="Main">
        <Link href="/" className={styles.wordmark}>Methea</Link>
        <div className={styles.navLinks}>
          <Link href="/blog" className={styles.navLink}>Blog</Link>
          <Link href="/login" className={styles.navCta}>Sign in →</Link>
        </div>
      </nav>

      <main>
        {/* 1. Hero */}
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div className={styles.stack}>
            <span className={styles.eyebrow}>For Master’s and PhD students</span>
            <h1 className={styles.h1}>Your research proposal is due. Your question, theory and method <span className={styles.mark}>still don’t line up.</span></h1>
            <p className={styles.lede}>Line them up tonight — before your supervisor sends it back. Methea asks the questions your supervisor would ask. You decide. You write.</p>
            <TopicForm id="topic-top" />
          </div>
          <figure className={styles.screen}>
            <video
              src="/landing/methea-demo.mp4" poster="/landing/methea-demo-poster.jpg"
              autoPlay muted loop playsInline preload="metadata"
              aria-label="Methea turning a broad topic into a research question, matching theories and a framework diagram"
              className={styles.video}
            />
            <figcaption className={styles.caption}>A broad topic → one researchable question → theories that fit → how they connect.</figcaption>
          </figure>
        </section>

        {/* 2. Cost of waiting */}
        <section className={`${styles.wrap} ${styles.split}`}>
          <div className={styles.stack}>
            <h2 className={styles.h2}>Every rewrite costs you weeks you don’t have.</h2>
            <p className={styles.p}>One research methods instructor told us her Master’s students spend weeks and many rewrites just to define what they’re researching. Not writing. Not collecting data. Just figuring out what the study is.</p>
            <p className={styles.pStrong}>If your proposal comes back now, that’s another month — and your deadline doesn’t move.</p>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}><b>4–5</b><span>weeks to define the study</span></div>
            <div className={styles.stat}><b>8–9</b><span>rewrites of the research question</span></div>
            <small className={styles.statNote}>From an interview with a research methods instructor</small>
          </div>
        </section>

        {/* 3. Why proposals come back */}
        <section className={styles.wrap}>
          <div className={styles.stack}>
            <h2 className={styles.h2}>Three comments. One problem.</h2>
            <div className={styles.comments}>
              {['“Too broad.”', '“Where does the theory come in?”', '“Why interviews?”'].map(c => <span key={c} className={styles.comment}>{c}</span>)}
            </div>
            <p className={styles.p}>They sound like three problems. It’s one: your question, theory and method don’t follow from each other. Each part can look fine on its own and still not hold together.</p>
            <div className={styles.card}><ChainDiagram /></div>
          </div>
        </section>

        {/* 4. The library */}
        <section className={`${styles.wrap} ${styles.split}`}>
          <div className={styles.libraryNum}><span className={styles.mark}>{LIBRARY}</span><small>theories in a curated library</small></div>
          <div className={styles.stack}>
            <h2 className={styles.h2}>Real theories. Real authors. Nothing made up.</h2>
            <p className={styles.p}>Methea suggests theories only from its own library of {LIBRARY} — each by real authors, with a source you can check. For your question it picks the ones that fit and tells you why, in plain words. If the theory you need isn’t there, you can add your own.</p>
          </div>
        </section>

        {/* 5. Value stack */}
        <section className={styles.wrap}>
          <div className={styles.stack}>
            <h2 className={styles.h2}>What you’ll have before you start writing.</h2>
            <div className={styles.offer}>
              <div className={styles.card}>
                <span className={styles.tagFree}>Free · tonight</span>
                <ul className={styles.have}>
                  <li>A research question narrow enough to defend</li>
                  <li>Theories from the {LIBRARY} library that fit it, each with the reason why and a checked citation</li>
                  <li>A framework diagram that shows how they connect</li>
                </ul>
              </div>
              <div className={styles.card}>
                <span className={styles.tag}>Full project · {price}, one-time</span>
                <ul className={styles.have}>
                  <li>A methodology with the reason behind every choice</li>
                  <li>An interview guide where every question maps to your framework</li>
                  <li>Transcript analysis and full export</li>
                </ul>
              </div>
            </div>
            <p className={styles.pStrong}>When your committee asks “why this?”, you’ll have the answer.</p>
          </div>
        </section>

        {/* 6. Not an AI writer */}
        <section className={styles.wrap}>
          <div className={styles.note}>
            <h2 className={styles.h2}>It won’t write your proposal. That’s the point.</h2>
            <p className={styles.p}>Methea never writes text you’d submit. It gives you the structure and the reasons, so the proposal you write is yours and you can defend every line. Safe to show your supervisor.</p>
          </div>
        </section>

        {/* 7. Check my topic */}
        <section className={styles.wrap} id="check">
          <div className={styles.cta}>
            <h2 className={styles.h2}>Check your topic now.</h2>
            <p>Type it the way it is — rough is fine. Methea starts from what you wrote and asks what your supervisor would ask.</p>
            <TopicForm id="topic-bottom" dark />
          </div>
        </section>

        {/* 8. FAQ */}
        <section className={styles.wrap}>
          <h2 className={styles.h2}>Questions</h2>
          <div className={styles.faqList}>
            {FAQ.map(([q, a]) => (
              <details key={q} className={styles.faq}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerWordmark}>Methea</span>
          <p className={styles.footerNote}>Methea is a thinking tool, not a writing tool. Students remain the authors of their own research.</p>
          <div className={styles.footerLinks}>
            <Link href="/blog">Blog</Link><span aria-hidden>·</span>
            <Link href="/privacy">Privacy</Link><span aria-hidden>·</span>
            <Link href="/terms">Terms</Link>
            <CookieSettingsDot />
            <CookieSettingsLink />
          </div>
        </div>
      </footer>

      <StickyCta target="check" watch={['topic-top', 'check']} />
    </div>
  )
}
