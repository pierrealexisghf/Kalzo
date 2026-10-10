'use client'

import { useState, useMemo } from 'react'
import { Search, Clock, Plus, Check } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { todayKey } from '@/lib/nutrition'
import { RECIPES, BREAKFAST_RECIPES } from '@/data/recipes'
import { Button, Card, Input, ScreenHeader, Sheet, Chip, EmptyState, MacroPills } from '@/components/ui/primitives'
import { MealTypeChips, defaultMealType } from './ToolKit'

const CATS = [
  { id: 'all', label: 'Toutes' },
  { id: 'breakfast', label: 'Petits-déj' },
  { id: 'rapide', label: '⏱ Rapides' },
  { id: 'sèche', label: 'Légères' },
  { id: 'masse', label: 'Riches' },
]
const ALL = [...RECIPES, ...BREAKFAST_RECIPES]
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Recipes() {
  const { addMeal, showToast } = useApp()
  const { back, day, home } = useNav()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [open, setOpen] = useState(null)
  const [mealType, setMealType] = useState(day === todayKey() ? defaultMealType() : 'dejeuner')

  const list = useMemo(() => {
    let l = ALL
    if (cat === 'breakfast') l = BREAKFAST_RECIPES
    else if (cat === 'rapide') l = ALL.filter(r => r.time <= 20 || r.tags?.includes('rapide'))
    else if (cat !== 'all') l = ALL.filter(r => r.tags?.includes(cat))
    const term = norm(q.trim())
    if (term) l = l.filter(r => norm(r.name).includes(term) || r.mainIngredients?.some(i => norm(i).includes(term)))
    return l
  }, [q, cat])

  const add = async (r) => {
    const meal = await addMeal({ name: r.name, emoji: r.emoji || '🍽️', macros: r.macros, mainIngredients: r.mainIngredients, mealType, source: 'recipe' }, day)
    if (meal) { showToast(`${r.name} ajouté`, 'success'); setOpen(null); home() }
  }

  return (
    <div className="tone-nutri">
      <ScreenHeader title="Recettes" subtitle={`${ALL.length} recettes équilibrées`} onBack={back} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Poulet, avocat, rapide…" className="pl-12" />
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATS.map(c => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</Chip>)}
      </div>

      <ul className="mt-4 space-y-2.5">
        {list.slice(0, 60).map(r => (
          <li key={r.id}>
            <button onClick={() => setOpen(r)} className="k-press k-card flex w-full items-center gap-3.5 p-3.5 text-left">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-tone-soft text-3xl">{r.emoji || '🍽️'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{r.name}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />{r.time} min · {r.macros?.kcal} kcal · {r.macros?.prot} g prot.
                </span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tone-soft text-tone"><Plus className="size-5" /></span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <EmptyState icon={Search} title="Aucune recette trouvée" text="Essayez un autre ingrédient." />}
      {list.length > 60 && <p className="mt-4 text-center text-xs text-muted-foreground">Affinez la recherche pour voir les {list.length - 60} autres.</p>}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name || ''}>
        {open && (
          <div className="tone-nutri space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="text-3xl">{open.emoji}</span><Clock className="size-4" />{open.time} min</div>
            <MacroPills macros={open.macros} />
            <Card className="p-4">
              <div className="k-label">Ingrédients</div>
              <ul className="space-y-1.5 text-sm">{open.ingredients?.map((i, k) => <li key={k}>• {i}</li>)}</ul>
            </Card>
            <Card className="p-4">
              <div className="k-label">Préparation</div>
              <p className="text-sm leading-relaxed">{open.instructions}</p>
            </Card>
            <MealTypeChips value={mealType} onChange={setMealType} />
            <Button size="lg" full onClick={() => add(open)}><Check className="size-5" />Ajouter au journal</Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
