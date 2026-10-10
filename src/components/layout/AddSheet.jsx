'use client'

import { useState, useEffect } from 'react'
import { Utensils, Dumbbell, Droplets, Scale, Sparkles, Search, ChefHat, PencilLine, ChevronRight, ChevronLeft, Plus } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { Sheet, IconBadge, Button, Input, cx } from '@/components/ui/primitives'
import { recentMeals, relativeDay, todayKey, fmtMl } from '@/lib/nutrition'

const TILES = [
  { id: 'meal', label: 'Repas', hint: 'Photo, texte, aliment', icon: Utensils, tone: 'tone-nutri' },
  { id: 'sport', label: 'Sport', hint: 'Séance ou activité', icon: Dumbbell, tone: 'tone-sport' },
  { id: 'water', label: 'Eau', hint: 'Un verre en un geste', icon: Droplets, tone: 'tone-water' },
  { id: 'weight', label: 'Poids', hint: 'Nouvelle pesée', icon: Scale, tone: 'tone-weight' },
]

function currentMealType() {
  const h = new Date().getHours()
  if (h < 10) return 'petit-dejeuner'
  if (h < 15) return 'dejeuner'
  if (h < 18) return 'collation'
  return 'diner'
}

function Row({ icon, title, hint, badge, onClick }) {
  return (
    <button onClick={onClick} className="k-press k-card flex w-full items-center gap-3.5 p-3.5 text-left">
      <IconBadge icon={icon} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[15px] font-semibold">{title}{badge}</div>
        <div className="text-[13px] text-muted-foreground">{hint}</div>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </button>
  )
}

const AiBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-coach-soft px-2 py-0.5 text-[10px] font-bold text-coach">
    <Sparkles className="size-3" />1 crédit
  </span>
)

export default function AddSheet() {
  const { addSheet, closeAdd, go, day } = useNav()
  const { dailyMeals, dailyWater, waterGoal, addMeal, addWater, addWeight, profile, showToast } = useApp()
  const [step, setStep] = useState('root')
  const [custom, setCustom] = useState('')
  const [weight, setWeight] = useState('')

  useEffect(() => {
    if (addSheet) { setStep(addSheet.step || 'root'); setCustom(''); setWeight('') }
  }, [addSheet])

  const open = !!addSheet
  const dayLabel = day !== todayKey() ? ` · ${relativeDay(day)}` : ''
  const recents = recentMeals(dailyMeals, 6)
  const waterToday = dailyWater[day]?.total || 0

  const titles = { root: `Ajouter${dayLabel}`, meal: 'Ajouter un repas', water: 'Boire un verre', weight: 'Nouvelle pesée' }

  const reAdd = async (m) => {
    const mealType = currentMealType()
    const meal = await addMeal({ name: m.name, emoji: m.emoji, macros: m.macros, mainIngredients: m.mainIngredients, mealType, source: 'recent' }, day)
    if (meal) { showToast(`${m.name} ajouté`, 'success'); closeAdd() }
  }

  const pourWater = async (ml) => {
    await addWater(ml, day)
    showToast(`+${fmtMl(ml)} · ${fmtMl(waterToday + ml)} sur ${fmtMl(waterGoal)}`, 'success')
    closeAdd()
  }

  const saveWeight = async () => {
    const w = parseFloat(weight.replace(',', '.'))
    if (!w || w < 25 || w > 350) return showToast('Entrez un poids valide (en kg)', 'error')
    await addWeight(w, day)
    showToast(`Pesée enregistrée : ${w} kg`, 'success')
    closeAdd()
  }

  return (
    <Sheet open={open} onClose={closeAdd} title={titles[step] || 'Ajouter'}>
      {step !== 'root' && (
        <button onClick={() => setStep('root')} className="k-press -mt-1 mb-3 flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          <ChevronLeft className="size-4" />Retour
        </button>
      )}

      {step === 'root' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {TILES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => (t.id === 'sport' ? go('sport-add') : setStep(t.id))}
                  className={cx(t.tone, 'k-press k-card flex flex-col items-start gap-3 p-4 text-left')}
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-tone text-tone-fg"><Icon className="size-6" /></span>
                  <span>
                    <span className="block text-base font-bold">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {recents.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Remanger en un geste</div>
              <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
                {recents.map(m => (
                  <button key={m.id} onClick={() => reAdd(m)} className="k-press k-card tone-nutri flex w-40 shrink-0 flex-col gap-1 p-3 text-left">
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(m.macros?.kcal || 0)} kcal</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {step === 'meal' && (
        <div className="tone-nutri flex flex-col gap-2.5">
          <Row icon={Sparkles} title="Photo ou description" hint="L'IA calcule calories et macros" badge={<AiBadge />} onClick={() => go('meal-ai')} />
          <Row icon={Search} title="Chercher un aliment" hint="Base Open Food Facts, gratuit" onClick={() => go('food-search')} />
          <Row icon={ChefHat} title="Recettes" hint="Plus de 230 recettes prêtes à ajouter" onClick={() => go('recipes')} />
          <Row icon={PencilLine} title="Saisie rapide" hint="Entrez vous-même les calories" onClick={() => go('quick-meal')} />
        </div>
      )}

      {step === 'water' && (
        <div className="tone-water">
          <p className="mb-4 text-sm text-muted-foreground">
            {fmtMl(waterToday)} bu sur {fmtMl(waterGoal)}.
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {[150, 250, 330, 500].map(ml => (
              <button key={ml} onClick={() => pourWater(ml)} className="k-press k-card flex flex-col items-center gap-1 py-4">
                <Droplets className="size-6 text-tone" />
                <span className="text-sm font-bold">{ml}</span>
                <span className="text-[10px] font-semibold text-muted-foreground">ml</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2.5">
            <Input type="number" inputMode="numeric" placeholder="Autre quantité (ml)" value={custom} onChange={e => setCustom(e.target.value)} />
            <Button variant="tone" onClick={() => { const ml = parseInt(custom); if (ml > 0 && ml <= 5000) pourWater(ml) }} disabled={!custom}>
              <Plus className="size-5" />
            </Button>
          </div>
        </div>
      )}

      {step === 'weight' && (
        <div className="tone-weight">
          <p className="mb-4 text-sm text-muted-foreground">
            {profile?.weight ? `Dernier poids connu : ${profile.weight} kg.` : 'Pèse-toi de préférence le matin, à jeun.'}
          </p>
          <div className="flex gap-2.5">
            <Input type="text" inputMode="decimal" placeholder="Ex : 72,5" value={weight} onChange={e => setWeight(e.target.value)} autoFocus />
            <Button variant="tone" onClick={saveWeight} disabled={!weight}>Enregistrer</Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
