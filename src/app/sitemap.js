const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kalzo.vercel.app'

export default function sitemap() {
  const paths = ['', '/support', '/supprimer-mon-compte', '/confidentialite', '/cgu', '/cgv', '/mentions-legales']
  return paths.map(p => ({ url: `${SITE_URL}${p}`, lastModified: new Date('2026-10-30'), changeFrequency: p ? 'monthly' : 'weekly', priority: p ? 0.4 : 1 }))
}
