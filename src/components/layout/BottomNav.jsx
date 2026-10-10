'use client'

import { House, BookOpen, Plus, Sparkles, UserRound } from 'lucide-react'
import { useNav } from '@/lib/nav'
import { cx } from '@/components/ui/primitives'

const SLOTS = [
  { id: 'home', label: 'Accueil', icon: House },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'add' },
  { id: 'coach', label: 'Coach IA', icon: Sparkles },
  { id: 'me', label: 'Moi', icon: UserRound },
]

// Barre flottante en capsule (même esprit que Mon Vestiaire) : quatre onglets
// et, au centre, le bouton ➕ qui ouvre l'ajout rapide.
export default function BottomNav() {
  const { tab, setTab, openAdd } = useNav()
  const activeIndex = SLOTS.findIndex(s => s.id === tab)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
      <nav
        aria-label="Navigation principale"
        className="pointer-events-auto relative mx-auto grid h-16 max-w-md grid-cols-5 items-center rounded-full border border-border bg-card/90 shadow-float backdrop-blur-xl"
      >
        {/* Pastille glissante derrière l'onglet actif */}
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-1/5 px-1 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`, opacity: activeIndex < 0 ? 0 : 1 }}
        >
          <span className="block h-full rounded-full bg-accent" />
        </span>

        {SLOTS.map(s => {
          if (s.id === 'add') {
            return (
              <div key="add" className="relative flex justify-center">
                <button
                  onClick={() => openAdd('root')}
                  aria-label="Ajouter"
                  className="k-press -translate-y-4 flex size-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float ring-[5px] ring-background"
                >
                  <Plus className="size-7" strokeWidth={2.6} />
                </button>
              </div>
            )
          }
          const Icon = s.icon
          const active = tab === s.id
          return (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              aria-current={active ? 'page' : undefined}
              className={cx('k-press relative z-10 flex h-full flex-col items-center justify-center gap-0.5', active ? 'text-primary' : 'text-muted-foreground')}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10.5px] font-semibold leading-none">{s.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
