import { LogoMark } from '@/components/ui/Logo'

const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || ''

export function StoreButton({ className = '' }) {
  const base = 'inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-7 text-base font-bold'
  if (!APP_STORE_URL) {
    return <span aria-disabled="true" className={`${base} cursor-not-allowed bg-muted text-muted-foreground ${className}`}>Bientôt disponible sur l’App Store</span>
  }
  return <a href={APP_STORE_URL} className={`${base} bg-primary text-primary-foreground ${className}`}> Télécharger sur l’App Store</a>
}

const STEPS = [
  { n: '1', emoji: '📸', title: 'Photographie ton assiette', text: 'Chaque midi et chaque soir, un tap, une photo. L’IA estime les valeurs en quelques secondes — ou tu saisis à la main, gratuitement.' },
  { n: '2', emoji: '⭐', title: 'Reçois ta note', text: 'De 1 à 5 étoiles selon l’équilibre du repas, avec protéines, glucides et lipides. Pas de calories affichées, pas de culpabilité.' },
  { n: '3', emoji: '👋', title: 'Partage avec tes amis', text: 'Tes amis voient ton repas, réagissent d’un emoji et te répondent. Tu vois le leur. Pas de classement, juste de l’émulation.' },
]

const PLANS = [
  { name: 'Essai', price: '0 €', sub: '7 jours, sans carte', items: ['Scans IA illimités', 'Coach IA inclus', 'Tout le reste gratuit'], accent: true },
  { name: 'Gratuit', price: '0 €', sub: 'après l’essai', items: ['5 scans IA par semaine', 'Feed, amis, journal, sport, eau', 'Saisie manuelle illimitée'] },
  { name: 'Essentiel', price: '4,99 €', sub: 'par mois', items: ['30 scans IA par semaine', 'Feed, amis, journal, sport, eau'] },
  { name: 'Plus', price: '7,99 €', sub: 'par mois', items: ['30 scans IA par semaine', 'Coach IA : Frigo Vide, Restaurant, Plan 7 jours, Batch cooking'], badge: 'Recommandé' },
  { name: 'Illimité', price: '10,99 €', sub: 'par mois', items: ['Scans IA illimités', 'Coach IA inclus'] },
]

const FAQ = [
  ['Les calories sont-elles visibles par mes amis ?', 'Non. Tes amis voient la photo, la note en étoiles et les protéines, glucides et lipides. Tes calories restent privées, dans ton journal.'],
  ['Combien de temps mes photos sont-elles conservées ?', '30 jours. Ensuite elles sont supprimées automatiquement ; le repas, ses valeurs et ses étoiles restent dans ton journal.'],
  ['Qui peut voir mes repas ?', 'Uniquement les amis dont tu as accepté la demande, et seulement les repas que tu choisis de partager. Tu peux masquer, signaler ou bloquer à tout moment.'],
  ['Qu’est-ce qu’un « scan » ?', 'Une estimation par IA lancée depuis le bouton + : l’analyse d’un repas (photo ou texte) ou d’une séance de sport décrite. La saisie manuelle et le calcul du sport par MET sont gratuits et illimités.'],
  ['Que se passe-t-il après les 7 jours d’essai ?', 'Tu repasses automatiquement au plan gratuit (5 scans par semaine), sans aucun prélèvement. Tout ce qui est social et le suivi restent gratuits.'],
  ['Comment résilier ?', 'Les abonnements passent par l’App Store : Réglages › ton nom › Abonnements. Le bouton « Gérer mon abonnement » de l’app y mène directement.'],
  ['Kalzo remplace-t-il un avis médical ?', 'Non. Les valeurs sont des estimations indicatives. Parles-en à un médecin ou un diététicien avant de modifier ton alimentation.'],
]

function Phone({ label }) {
  return (
    <div className="mx-auto aspect-[9/19] w-48 rounded-[2.2rem] border-[6px] border-foreground/90 bg-gradient-to-b from-nutri-soft to-accent p-3 shadow-float sm:w-56">
      {/* Emplacement de capture d'écran : remplacer ce bloc par <Image src="/screens/…" /> */}
      <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-primary/30 text-center text-xs font-semibold text-primary/70">{label}</div>
    </div>
  )
}

export default function Landing() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <a href="/" className="flex items-center gap-2.5 text-lg font-extrabold"><LogoMark size={34} className="rounded-xl" />Kalzo</a>
        <nav className="flex gap-5 text-sm font-semibold text-muted-foreground">
          <a href="#offres">Offres</a><a href="#faq">FAQ</a><a href="/support">Support</a>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-10 text-center">
        <p className="mb-4 inline-block rounded-full bg-nutri-soft px-4 py-1.5 text-sm font-bold text-nutri">🍽️ Le BeReal du repas</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Poste ton repas.<br />Partage-le avec tes amis.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Chaque midi et chaque soir, une photo, une note en étoiles et les macros — sans afficher les calories. Ton journal garde tes souvenirs, le coach IA t’aide à mieux manger.</p>
        <div className="mt-8 flex flex-col items-center gap-3"><StoreButton /><span className="text-sm text-muted-foreground">7 jours d’essai gratuit · sans carte bancaire · iPhone</span></div>
        <div className="mt-14 flex items-end justify-center gap-4 sm:gap-8">
          <div className="hidden sm:block"><Phone label="Feed des amis" /></div>
          <Phone label="Photo + note en étoiles" />
          <div className="hidden sm:block"><Phone label="Journal souvenirs" /></div>
        </div>
      </section>

      <section className="bg-card py-16">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight">Comment ça marche</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map(s => (
              <div key={s.n} className="k-card p-6">
                <div className="mb-3 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">{s.n}</span><span className="text-3xl">{s.emoji}</span></div>
                <h3 className="mb-1.5 text-lg font-bold">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="offres" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="mb-2 text-center text-3xl font-extrabold tracking-tight">Des offres simples</h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">Le feed, les amis, les étoiles, le journal, la saisie manuelle, l’eau, le sport et les rappels sont toujours gratuits. Les offres ajoutent des scans IA et le coach.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map(p => (
            <div key={p.name} className={`k-card flex flex-col p-5 ${p.accent ? 'ring-2 ring-primary' : ''} ${p.badge ? 'ring-2 ring-nutri' : ''}`}>
              <div className="flex items-center justify-between"><h3 className="text-lg font-extrabold">{p.name}</h3>{p.badge && <span className="rounded-full bg-nutri px-2 py-0.5 text-[11px] font-bold text-white">{p.badge}</span>}</div>
              <p className="mt-2 text-3xl font-extrabold">{p.price}</p><p className="mb-4 text-xs text-muted-foreground">{p.sub}</p>
              <ul className="space-y-2 text-sm">{p.items.map(i => <li key={i} className="flex gap-2"><span className="text-nutri">✓</span><span>{i}</span></li>)}</ul>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">Prix mensuels indicatifs ; formules trimestrielle et annuelle moins chères. Abonnements gérés par l’App Store, résiliables à tout moment.</p>
      </section>

      <section id="faq" className="bg-card py-16">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="mb-8 text-center text-3xl font-extrabold tracking-tight">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="k-card group p-5">
                <summary className="cursor-pointer list-none text-[16px] font-bold">{q}</summary>
                <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Prêt à poster ton premier repas ?</h2>
        <div className="mt-6 flex justify-center"><StoreButton /></div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        <p className="mb-2">Kalzo · le BeReal du repas · ne remplace pas l’avis d’un médecin ou d’un diététicien</p>
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Confidentialité</a><a href="/cgu">CGU</a><a href="/cgv">CGV</a><a href="/support">Support</a><a href="/supprimer-mon-compte">Supprimer mon compte</a>
        </p>
      </footer>
    </main>
  )
}
