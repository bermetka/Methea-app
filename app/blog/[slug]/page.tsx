import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BlogFooter, BlogNav, JsonLd, formatDate } from '@/components/blog/BlogChrome'
import { postBody } from '@/lib/blog/content'
import { AUTHOR, POSTS, SITE_URL, ctaHref, getPost } from '@/lib/blog/posts'
import styles from '../blog.module.css'

export const dynamicParams = false

export function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug)
  if (!post) return {}
  const url = `/blog/${post.slug}`
  return {
    title: `${post.seoTitle} | Methea`,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: AUTHOR.name }],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      siteName: 'Methea',
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: [AUTHOR.name],
    },
    twitter: { card: 'summary', title: post.seoTitle, description: post.description },
  }
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()
  const { html, referencesHtml, readingMinutes } = postBody(post.slug)
  const url = `${SITE_URL}/blog/${post.slug}`
  const related = POSTS.filter(p => p.slug !== post.slug)

  return (
    <div className={styles.root}>
      <BlogNav />
      <main className={styles.main}>
        <article>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/blog">Blog</Link>
          </nav>
          <h1 className={styles.postTitle}>{post.title}</h1>
          <p className={styles.meta}>
            By <a href="#author">{AUTHOR.name}</a> · <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time>
            {post.dateModified !== post.datePublished && (
              <> · Updated <time dateTime={post.dateModified}>{formatDate(post.dateModified)}</time></>
            )}
            {' '}· {readingMinutes} min read
          </p>

          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />

          <section className={styles.faq} aria-labelledby="faq">
            <h2 id="faq">FAQ</h2>
            {post.faq.map(f => (
              <div key={f.q} className={styles.faqItem}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </section>

          <aside className={styles.cta}>
            <h2 className={styles.ctaHeading}><span className={styles.mark}>{post.cta.heading}</span></h2>
            <p>{post.cta.body}</p>
            <a href={ctaHref(post)} className={styles.ctaButton}>Check my research for free</a>
          </aside>

          {referencesHtml && (
            <section className={`${styles.prose} ${styles.references}`} aria-labelledby="references">
              <h2 id="references">References</h2>
              <div dangerouslySetInnerHTML={{ __html: referencesHtml }} />
            </section>
          )}

          <section id="author" className={styles.author} aria-label="About the author">
            <p className={styles.authorName}>{AUTHOR.name}</p>
            <p className={styles.authorRole}>{AUTHOR.role}</p>
            <p className={styles.authorBio}>{AUTHOR.bio}</p>
          </section>
        </article>

        {related.length > 0 && (
          <section className={styles.related} aria-label="More guides">
            <h2>More guides</h2>
            <ul>
              {related.map(p => (
                <li key={p.slug}><Link href={`/blog/${p.slug}`}>{p.title}</Link></li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BlogFooter />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BlogPosting',
              '@id': `${url}#article`,
              headline: post.title,
              description: post.description,
              url,
              mainEntityOfPage: url,
              datePublished: post.datePublished,
              dateModified: post.dateModified,
              inLanguage: 'en',
              isAccessibleForFree: true,
              keywords: post.keywords.join(', '),
              author: { '@type': 'Person', name: AUTHOR.name, jobTitle: AUTHOR.role, url: AUTHOR.url },
              publisher: { '@type': 'Organization', name: 'Methea', url: SITE_URL },
            },
            {
              '@type': 'FAQPage',
              '@id': `${url}#faq`,
              mainEntity: post.faq.map(f => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Methea', item: SITE_URL },
                { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
                { '@type': 'ListItem', position: 3, name: post.title, item: url },
              ],
            },
          ],
        }}
      />
    </div>
  )
}
