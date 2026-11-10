import type { Metadata } from 'next'
import Link from 'next/link'
import { priceLabel } from '@/lib/pricing'
import CheckQuiz from './CheckQuiz'
import styles from './check.module.css'
import CookieSettingsLink, { CookieSettingsDot } from '@/components/consent/CookieSettingsLink'

const DESCRIPTION =
  'A 2-minute check for Master\'s and PhD students and applicants: see where your research proposal is, what you already have, and the one next step.'

export const metadata: Metadata = {
  title: 'Where is your research proposal right now? | Methea',
  description: DESCRIPTION,
  alternates: { canonical: '/check' },
  openGraph: { type: 'website', url: '/check', title: 'Where is your research proposal right now?', description: DESCRIPTION, siteName: 'Methea' },
}

export default function CheckPage() {
  return (
    <div className={styles.root}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap" />
      <nav className={styles.nav} aria-label="Main">
        <Link href="/" className={styles.wordmark}>Methea</Link>
        <div className={styles.navLinks}>
          <Link href="/blog" className={styles.navLink}>Blog</Link>
          <Link href="/login" className={styles.navCta}>Sign in →</Link>
        </div>
      </nav>
      <main>
        <CheckQuiz priceLabel={priceLabel(process.env.NEXT_PUBLIC_PRICE_LABEL_A) || '$49'} />
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
    </div>
  )
}
