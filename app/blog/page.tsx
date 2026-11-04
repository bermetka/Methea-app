import type { Metadata } from 'next'
import Link from 'next/link'
import { BlogFooter, BlogNav, JsonLd, formatDate } from '@/components/blog/BlogChrome'
import { SITE_URL, postsByDate } from '@/lib/blog/posts'
import styles from './blog.module.css'

const DESCRIPTION =
  'Practical guides for Master’s and PhD students: research questions, theoretical frameworks, methodology, interviews and analysis.'

export const metadata: Metadata = {
  title: 'Blog — Research methods guides for Master’s and PhD students | Methea',
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: { type: 'website', url: '/blog', title: 'The Methea blog', description: DESCRIPTION, siteName: 'Methea' },
}

export default function BlogIndex() {
  const posts = postsByDate()
  return (
    <div className={styles.root}>
      <BlogNav />
      <main className={styles.main}>
        <header className={styles.indexHeader}>
          <p className={styles.kicker}>The Methea blog</p>
          <h1 className={styles.indexTitle}>Research methods, <span className={styles.mark}>step by step</span>.</h1>
          <p className={styles.indexLede}>{DESCRIPTION}</p>
        </header>
        <ul className={styles.postList}>
          {posts.map(p => (
            <li key={p.slug} className={styles.postCard}>
              <Link href={`/blog/${p.slug}`} className={styles.postCardLink}>
                <h2 className={styles.postCardTitle}>{p.title}</h2>
                <p className={styles.postCardDesc}>{p.description}</p>
                <p className={styles.meta}><time dateTime={p.datePublished}>{formatDate(p.datePublished)}</time></p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <BlogFooter />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'The Methea blog',
          url: `${SITE_URL}/blog`,
          description: DESCRIPTION,
          publisher: { '@type': 'Organization', name: 'Methea', url: SITE_URL },
          blogPost: posts.map(p => ({
            '@type': 'BlogPosting',
            headline: p.title,
            url: `${SITE_URL}/blog/${p.slug}`,
            datePublished: p.datePublished,
          })),
        }}
      />
    </div>
  )
}
