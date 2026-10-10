import './globals.css'
import { GeistSans } from 'geist/font/sans'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kalzo.vercel.app'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Kalzo — Coach nutrition, sport & hydratation', template: '%s · Kalzo' },
  description:
    "Suivez vos repas, votre activité et votre hydratation, et laissez l'IA vous guider : analyse de repas par photo, recettes anti-gaspi, plan sur 7 jours.",
  manifest: '/manifest.json',
  applicationName: 'Kalzo',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Kalzo' },
  openGraph: {
    title: 'Kalzo — Coach nutrition, sport & hydratation',
    description: "Votre coach nutrition avec IA : repas, sport, eau, objectifs.",
    siteName: 'Kalzo',
    locale: 'fr_FR',
    type: 'website',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0a110d' },
  ],
}

// Applique le thème avant le premier affichage pour éviter un flash blanc.
const themeScript = `
try {
  var t = localStorage.getItem('kalzo-theme') || 'auto';
  var dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
`

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans bg-background text-foreground">{children}</body>
    </html>
  )
}
