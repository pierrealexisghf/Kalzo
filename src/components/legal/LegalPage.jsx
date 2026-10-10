import { LogoMark } from '@/components/ui/Logo'
import BackLink from '@/components/legal/BackLink'

// Socle des pages légales (mentions, confidentialité, CGU, CGV). Lisibles hors de
// l'application : un visiteur non connecté doit pouvoir les ouvrir.
export function LegalPage({ title, updated, children }) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <a href="/" className="flex items-center gap-2.5 font-bold"><LogoMark size={30} className="rounded-lg" />Kalzo</a>
          <BackLink />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-primary">{title}</h1>
        <p className="mb-10 mt-2 text-sm text-muted-foreground">Dernière mise à jour : {updated}</p>
        {children}
      </article>
      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        <p className="mb-2">Kalzo · nutrition, sport et hydratation</p>
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/confidentialite">Confidentialité</a>
          <a href="/cgu">CGU</a>
          <a href="/cgv">CGV</a>
        </p>
      </footer>
    </main>
  )
}

export const H2 = ({ children }) => <h2 className="mb-3 mt-10 text-xl font-bold text-primary">{children}</h2>
export const H3 = ({ children }) => <h3 className="mb-2 mt-6 text-base font-semibold text-primary">{children}</h3>
export const P = ({ children }) => <p className="mb-3 text-[15px] leading-7 text-foreground/80">{children}</p>
export const UL = ({ items }) => (
  <ul className="mb-3 list-disc space-y-1 pl-6 text-[15px] leading-7 text-foreground/80">
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
)
export const Note = ({ children }) => (
  <div className="mb-3 rounded-2xl border border-nutri/30 bg-nutri-soft px-5 py-4 text-[15px] leading-7">{children}</div>
)
export const A = ({ href, children }) => <a href={href} className="font-semibold text-primary underline">{children}</a>
export function Table({ head, rows }) {
  return (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead><tr>{head.map(h => <th key={h} className="border-b-2 border-border px-2.5 py-2 text-left font-bold text-primary">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-border px-2.5 py-2 align-top leading-6 text-foreground/80">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
