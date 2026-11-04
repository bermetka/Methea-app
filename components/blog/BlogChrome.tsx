import Link from 'next/link'
import styles from '@/app/blog/blog.module.css'

export function BlogNav() {
  return (
    <nav className={styles.nav} aria-label="Main">
      <Link href="/" className={styles.wordmark}>Methea</Link>
      <div className={styles.navLinks}>
        <Link href="/blog" className={styles.navLink}>Blog</Link>
        <Link href="/check" className={styles.navLink}>Free check</Link>
        <Link href="/login" className={styles.navCta}>Sign in →</Link>
      </div>
    </nav>
  )
}

export function BlogFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span className={styles.footerWordmark}>Methea</span>
        <p className={styles.footerTagline}>Your research, methodically.</p>
        <p className={styles.footerNote}>
          Methea is a thinking tool, not a writing tool. Students remain the authors of their own research.
        </p>
        <div className={styles.footerLinks}>
          <Link href="/blog">Blog</Link><span aria-hidden>·</span>
          <Link href="/privacy">Privacy</Link><span aria-hidden>·</span>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  )
}

export function JsonLd({ data }: { data: object }) {
  // `<` escaped so the JSON can't close the script tag.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
