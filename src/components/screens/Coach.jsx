'use client'

import { Sparkles, Refrigerator, ScanText, CookingPot, CalendarRange, Camera, Search, ChefHat, ChevronRight, Crown } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { Card, IconBadge, SectionTitle, cx } from '@/components/ui/primitives'

const TOOLS = [
  { id: 'meal-ai', icon: Camera, title: 'Analyse de repas', text: 'Une photo ou quelques mots, et vos calories sont calculées.' },
  { id: 'frigo', icon: Refrigerator, title: 'Frigo Vide', text: 'Une recette avec ce qu\'il vous reste à la maison.' },
  { id: 'restaurant', icon: ScanText, title: 'Restaurant', text: 'Photographiez la carte, repérez le meilleur choix.' },
  { id: 'plan', icon: CalendarRange, title: 'Plan 7 jours', text: 'Un menu complet pour la semaine, adapté à vous.' },
  { id: 'batch', icon: CookingPot, title: 'Batch cooking', text: 'Cuisinez une fois, mangez toute la semaine.' },
]

export default function Coach() {
  const { credits, isVip, currentPlan } = useApp()
  const { go } = useNav()
  const low = !isVip && credits <= 2

  return (
    <div className="tone-coach">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">Coach IA</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Votre assistant nutrition</p>
        </div>
        <button onClick={() => go('subscription')} className="k-press flex items-center gap-1.5 rounded-full bg-tone-soft px-3.5 py-2 text-sm font-bold text-tone">
          <Sparkles className="size-4" />{isVip ? 'Illimité' : `${credits} crédit${credits > 1 ? 's' : ''}`}
        </button>
      </header>

      {low && (
        <button onClick={() => go('subscription')} className="k-press mb-4 flex w-full items-center gap-3 rounded-3xl bg-gradient-to-br from-coach to-nutri p-4 text-left text-white shadow-soft">
          <Crown className="size-7 shrink-0" />
          <span className="flex-1">
            <span className="block text-[15px] font-bold">{credits === 0 ? 'Plus de crédits IA' : 'Bientôt à court de crédits'}</span>
            <span className="block text-[13px] opacity-90">Découvrez les offres, essai gratuit 7 jours.</span>
          </span>
          <ChevronRight className="size-5" />
        </button>
      )}

      <div className="space-y-2.5">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => go(t.id)} className="k-press k-card flex w-full items-center gap-4 p-4 text-left">
            <IconBadge icon={t.icon} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[16px] font-bold">
                {t.title}
                {t.id === 'plan' && currentPlan && <span className="rounded-full bg-nutri-soft px-2 py-0.5 text-[10px] font-bold text-nutri">En cours</span>}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{t.text}</span>
            </span>
            <span className="shrink-0 rounded-full bg-coach-soft px-2.5 py-1 text-[11px] font-bold text-coach">1 crédit</span>
          </button>
        ))}
      </div>

      <SectionTitle>Gratuit, sans crédit</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => go('food-search')} className="tone-nutri k-press k-card flex flex-col gap-3 p-4 text-left">
          <IconBadge icon={Search} />
          <span><span className="block text-[15px] font-bold">Chercher un aliment</span><span className="block text-xs text-muted-foreground">Nom ou code-barres</span></span>
        </button>
        <button onClick={() => go('recipes')} className="tone-nutri k-press k-card flex flex-col gap-3 p-4 text-left">
          <IconBadge icon={ChefHat} />
          <span><span className="block text-[15px] font-bold">Recettes</span><span className="block text-xs text-muted-foreground">230 idées équilibrées</span></span>
        </button>
      </div>
    </div>
  )
}
