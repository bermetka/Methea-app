// Blog registry: metadata for every post in content/blog/<slug>.md.
// The body lives in the .md file; everything a search engine or AI answer engine
// reads as structured data (title, dates, author, FAQ) lives here, once.

export const SITE_URL = 'https://www.methea.app'

export const AUTHOR = {
  name: 'Bermet Koshoeva',
  role: 'Founder of Methea · Lecturer at the American University of Central Asia (AUCA)',
  bio: 'Bermet has taught university courses at AUCA and built Methea after watching students lose weeks aligning their question, theory and method. Erasmus Mundus MSc (University of Copenhagen and Montpellier SupAgro).',
  url: `${SITE_URL}/blog`,
}

// Landing hook on /start (see lib/start-cookies.ts): question | lens | deadline.
export type Angle = 'question' | 'lens' | 'deadline'

export type Faq = { q: string; a: string }

export type Post = {
  slug: string
  title: string          // H1 on the page
  seoTitle: string       // <title>, ≤ 60 chars
  description: string    // meta description, ≤ 160 chars
  datePublished: string  // YYYY-MM-DD
  dateModified: string   // YYYY-MM-DD
  keywords: string[]     // first one is the primary keyword
  angle: Angle
  cta: { heading: string; body: string }
  faq: Faq[]
}

export const POSTS: Post[] = [
  {
    slug: 'theoretical-vs-conceptual-vs-analytical-framework',
    title: 'Theoretical vs Conceptual vs Analytical Framework (and Where the Literature Review Fits)',
    seoTitle: 'Theoretical vs Conceptual vs Analytical Framework',
    description:
      'The difference between a theoretical, conceptual and analytical framework — and how each differs from a literature review, with one worked example.',
    datePublished: '2026-11-04',
    dateModified: '2026-11-04',
    keywords: [
      'conceptual framework vs theoretical framework',
      'analytical framework',
      'theoretical framework vs literature review',
      'what is a theoretical lens',
    ],
    angle: 'lens',
    cta: {
      heading: 'Check your own study',
      body: 'Knowing the definitions is the easy part. Making your question, theory, concepts and analysis line up is where most proposals get stuck. Take a 2-minute check on your own idea: you’ll see what you already have and the one next step. Methea can pick it up from there. It doesn’t write your thesis.',
    },
    faq: [
      {
        q: 'Is a conceptual framework the same as a theoretical framework?',
        a: 'No. A theoretical framework borrows an existing theory; a conceptual framework is your own model of the concepts in your study. A conceptual framework often builds on one or more theories.',
      },
      {
        q: 'Can I use more than one theory?',
        a: 'Yes, if each one does a clear job — for example, one theory explains the mechanism and another explains the context. Two theories that explain the same thing usually weaken the framework.',
      },
      {
        q: 'Is the analytical framework part of the methodology?',
        a: 'Usually yes. It describes how you will analyse your data, so it sits in or next to the methodology chapter.',
      },
      {
        q: 'Why does my supervisor say my theoretical framework is a literature review?',
        a: 'Because it probably lists studies on your topic instead of explaining one theory and showing how it shapes your questions and analysis.',
      },
      {
        q: 'Does the theory have to be recent?',
        a: 'No. Many widely used theories are decades old. What matters is that it fits your question and that you engage with how it has been critiqued and updated.',
      },
    ],
  },
  {
    slug: 'how-to-narrow-down-a-research-question',
    title: 'How to Narrow Down a Research Question (When Your Supervisor Says It’s Too Broad)',
    seoTitle: 'How to Narrow Down a Research Question: 5 Moves',
    description:
      'Research question too broad? Five moves to narrow it — who, where, one phenomenon, the right question word, your deadline — with before-and-after examples.',
    datePublished: '2026-11-04',
    dateModified: '2026-11-04',
    keywords: [
      'how to narrow down a research question',
      'research question too broad',
      'narrowing a research topic',
      'research question examples masters thesis',
    ],
    angle: 'question',
    cta: {
      heading: 'Narrow your own question',
      body: 'Paste your question or topic into a 2-minute check. You’ll see which pieces are already in place (the people, the place, one idea) and your next move. Methea can pick it up from there and suggest a sharper version. You stay the author.',
    },
    faq: [
      {
        q: 'How do I know if my research question is too broad?',
        a: 'If you can’t say which people you would study or which data you would collect, if it names a whole field like “education” or “technology”, or if it asks about “the impact of X on Y” with no group or setting, it is too broad.',
      },
      {
        q: 'Can a research question be too narrow?',
        a: 'Yes. If you can answer it with a single fact or a yes/no, or if no one beyond your case would care about the answer, widen the phenomenon or explain why the case matters.',
      },
      {
        q: 'Should a qualitative research question start with “how” or “why”?',
        a: 'Usually. How and why questions fit interviews and case studies. Questions starting with “to what extent” or “is there a relationship” fit quantitative designs.',
      },
      {
        q: 'Do I have to finalise my research question before choosing a theory?',
        a: 'No. Treat your first narrowed version as a working question. It often sharpens again once you choose a theoretical framework.',
      },
    ],
  },
  {
    slug: 'how-to-choose-a-theoretical-framework',
    title: 'How to Choose a Theoretical Framework for Your Dissertation',
    seoTitle: 'How to Choose a Theoretical Framework (5 Steps)',
    description:
      'A five-step way to choose a theory for your dissertation: pull concepts from your question, shortlist theories, run four fit tests, check critiques, justify.',
    datePublished: '2026-11-04',
    dateModified: '2026-11-04',
    keywords: [
      'how to choose a theoretical framework',
      'how to choose a theory for dissertation',
      'theoretical framework examples qualitative research',
      'what is a concept in research',
      'concept vs variable',
    ],
    angle: 'lens',
    cta: {
      heading: 'Find theories that fit your question',
      body: 'Start with a 2-minute check on your own idea: is it ready for a lens yet? Then Methea suggests theories from a curated library of 40+ established theories, explains why each one fits, and checks every citation against OpenAlex. It doesn’t write your thesis.',
    },
    faq: [
      {
        q: 'What is a concept in research?',
        a: 'A concept is an abstract idea that names what you want to understand — trust, motivation, belonging. It is not your topic (remote work) or your setting; it is the thing happening there that you can define, that can vary, and that you can recognise in your data.',
      },
      {
        q: 'What is the difference between a concept and a variable?',
        a: 'A variable is a concept made measurable, usually for quantitative research — for example, trust measured on a five-point scale. In qualitative research you define the concept and look for how it shows up in what people say.',
      },
      {
        q: 'How many theories should a dissertation use?',
        a: 'Usually one, sometimes two. Use a second theory only if it does a separate job, such as explaining the context while the first explains the mechanism.',
      },
      {
        q: 'Where do I find theories for my topic?',
        a: 'Look at the five to ten most-cited studies on your topic and note which theories they use. The same two or three usually come up; start your shortlist there.',
      },
      {
        q: 'Can a qualitative study use a theoretical framework?',
        a: 'Yes. In qualitative research a theory can shape your interview questions and give you deductive codes, while you stay open to inductive codes that emerge from the data.',
      },
      {
        q: 'What if no theory fits my question perfectly?',
        a: 'None will fit perfectly. Choose the one that passes the concept, level, job and data tests best, and state its limits and how you handle them.',
      },
    ],
  },
]

export function getPost(slug: string): Post | undefined {
  return POSTS.find(p => p.slug === slug)
}

export function postsByDate(): Post[] {
  return [...POSTS].sort((a, b) => b.datePublished.localeCompare(a.datePublished))
}

export function ctaHref(post: Post): string {
  const q = new URLSearchParams({
    a: post.angle,
    utm_source: 'blog',
    utm_medium: 'organic',
    utm_campaign: post.slug,
  })
  return `/check?${q.toString()}`
}
