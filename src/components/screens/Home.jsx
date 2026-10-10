'use client'

import { Flame, Sparkles, Droplets, Dumbbell, Plus, ChevronRight, Utensils, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import {
  todayKey, dayTotals, getGreeting, formatDay, computeStreak, MEAL_TYPES, mealTypeOf,
  weekDatesOf, shortDay, fmtMl,
} from '@/lib/nutrition'
import { Card, Ring, CountUp, MacroBar, IconBadge, SectionTitle, cx } from '@/components/ui/primitives'

function Chip({ icon: Icon, children, tone, onClick }) {
  return (
    <button onClick={onClick} className={cx(tone, 'k-press flex items-center gap-1.5 rounded-full bg-tone-soft px-3 py-1.5 text-[13px] font-bold text-tone')}>
      <Icon className="size-4" />{children}
    </button>
  )
}

// Verre qui se remplit : l'avancement de l'hydratation du jour.
function Glass({ ratio }) {
  const level = 100 - Math.min(100, Math.max(0, ratio * 100))
  return (
    <div className="relative h-[72px] w-12 overflow-hidden rounded-b-[18px] rounded-t-md border-2 border-tone/40 bg-tone-soft">
      <div className="absolute inset-x-0 bottom-0 bg-tone/80 transition-[height] duration-1000 ease-out" style={{ height: `${100 - level}%` }}>
        <svg className="k-wave absolute -top-2 left-0 h-3 w-[200%]" viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d="M0 5 Q 12.5 0 25 5 T 50 5 T 75 5 T 100 5 V10 H0 Z" className="fill-tone/80" />
        </svg>
      </div>
    </div>
  )
}

export default function Home() {
  const app = useApp()
  const { profile, firstName, credits, isVip, dailyMeals, dailySport, dailyWater, waterGoal, addWater, removeMeal, showToast } = app
  const { go, openAdd, setTab, setDay } = useNav()
  const today = todayKey()
  const t = dayTotals({ dailyMeals, dailySport, dailyWater }, today)
  const streak = computeStreak(dailyMeals)

  const goal = profile.kcal
  const remaining = goal - t.eaten + t.burned
  const over = remaining < 0
  const hour = new Date().getHours()

  // Suggestion contextuelle : le prochain repas à saisir.
  const logged = new Set(t.meals.map(mealTypeOf))
  let nudge = null
  if (!t.meals.length && hour >= 6) nudge = { text: "Vous n'avez encore rien saisi aujourd'hui.", cta: 'Ajouter un repas', run: () => openAdd('meal') }
  else if (hour >= 11 && hour < 15 && !logged.has('dejeuner')) nudge = { text: "C'est l'heure du déjeuner, qu'est-ce qu'on mange ?", cta: 'Frigo Vide', run: () => go('frigo') }
  else if (hour >= 18 && !logged.has('diner') && remaining > 150) nudge = { text: `Il vous reste ${Math.round(remaining)} kcal pour le dîner.`, cta: 'Idée de repas', run: () => go('frigo') }
  else if (t.water < waterGoal * 0.4 && hour >= 14) nudge = { text: "Pensez à boire, vous êtes à moins de la moitié de l'objectif.", cta: '+ 250 ml', run: () => { addWater(250); showToast('+250 ml', 'success') } }

  // Mini-graphique de la semaine.
  const week = weekDatesOf(today).map(d => ({ d, kcal: dayTotals({ dailyMeals, dailySport, dailyWater }, d).eaten }))
  const peak = Math.max(goal, ...week.map(w => w.kcal), 1)

  const mealsByType = MEAL_TYPES.map(mt => ({ ...mt, items: t.meals.filter(m => mealTypeOf(m) === mt.id) })).filter(g => g.items.length)

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{formatDay(today)}</p>
          <h1 className="truncate text-[28px] font-bold leading-tight tracking-tight">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Chip icon={Flame} tone="tone-sport" onClick={() => setTab('journal')}>{streak} j</Chip>
          <Chip icon={Sparkles} tone="tone-coach" onClick={() => go('subscription')}>{isVip ? '∞' : credits}</Chip>
        </div>
      </header>

      {/* Anneau des calories */}
      <Card className="tone-nutri p-5">
        <div className="flex items-center gap-5">
          <Ring
            size={164} stroke={15}
            segments={[
              { value: t.eaten, max: goal + t.burned, color: over ? 'text-destructive' : 'text-nutri' },
              { value: t.burned, max: goal, color: 'text-sport' },
            ]}
          >
            <CountUp value={Math.abs(Math.round(remaining))} className="text-[38px] font-extrabold leading-none tracking-tight" />
            <span className="mt-1 text-xs font-semibold text-muted-foreground">{over ? 'kcal en trop' : 'kcal restantes'}</span>
          </Ring>
          <div className="min-w-0 flex-1 space-y-3">
            {[
              ['Objectif', goal, 'bg-foreground/60'],
              ['Mangé', t.eaten, 'bg-nutri'],
              ['Brûlé', t.burned, 'bg-sport'],
            ].map(([label, value, dot]) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className={cx('size-2.5 rounded-full', dot)} />
                <div className="leading-tight">
                  <div className="text-[17px] font-bold">{Math.round(value)}<span className="ml-1 text-[11px] font-medium text-muted-foreground">kcal</span></div>
                  <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <MacroBar label="Protéines" value={t.macros.prot} max={profile.prot} colorClass="bg-prot" />
          <MacroBar label="Glucides" value={t.macros.gluc} max={profile.gluc} colorClass="bg-gluc" />
          <MacroBar label="Lipides" value={t.macros.lip} max={profile.lip} colorClass="bg-lip" />
        </div>
      </Card>

      {nudge && (
        <button onClick={nudge.run} className="tone-coach k-press flex w-full items-center gap-3 rounded-3xl bg-tone-soft p-4 text-left">
          <IconBadge icon={Sparkles} className="!bg-tone !text-tone-fg" />
          <p className="flex-1 text-[14px] font-medium leading-snug text-foreground">{nudge.text}</p>
          <span className="shrink-0 rounded-full bg-tone px-3 py-1.5 text-xs font-bold text-tone-fg">{nudge.cta}</span>
        </button>
      )}

      {/* Eau + Sport */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="tone-water flex flex-col p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eau</div>
              <div className="mt-1 text-2xl font-extrabold leading-none">{fmtMl(t.water)}</div>
              <div className="mt-1 text-xs text-muted-foreground">sur {fmtMl(waterGoal)}</div>
            </div>
            <Glass ratio={t.water / waterGoal} />
          </div>
          <button
            onClick={() => { addWater(250); showToast(`+250 ml · ${fmtMl(t.water + 250)}`, 'success') }}
            className="k-press mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-tone py-2.5 text-sm font-bold text-tone-fg"
          >
            <Plus className="size-4" />250 ml
          </button>
        </Card>

        <Card className="tone-sport flex flex-col p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sport</div>
              <div className="mt-1 text-2xl font-extrabold leading-none">{Math.round(t.burned)}<span className="ml-1 text-xs font-semibold text-muted-foreground">kcal</span></div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t.sports.length ? `${t.sports.reduce((s, a) => s + a.duration, 0)} min · ${t.sports.length} séance${t.sports.length > 1 ? 's' : ''}` : 'Aucune activité'}
              </div>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-tone-soft text-tone"><Dumbbell className="size-6" /></span>
          </div>
          <button onClick={() => go('sport-add')} className="k-press mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-tone py-2.5 text-sm font-bold text-tone-fg">
            <Plus className="size-4" />Activité
          </button>
        </Card>
      </div>

      {/* Repas du jour */}
      <SectionTitle right={<button onClick={() => openAdd('meal')} className="text-[13px] font-bold text-primary">+ Ajouter</button>}>Repas du jour</SectionTitle>
      {mealsByType.length === 0 ? (
        <button onClick={() => openAdd('meal')} className="k-press tone-nutri flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-border py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-tone-soft text-tone"><Utensils className="size-6" /></span>
          <span className="text-[15px] font-semibold">Aucun repas pour le moment</span>
          <span className="text-[13px] text-muted-foreground">Touchez ici pour enregistrer le premier</span>
        </button>
      ) : (
        <div className="space-y-3">
          {mealsByType.map(g => (
            <Card key={g.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-bold">{g.emoji} {g.label}</span>
                <span className="text-xs font-semibold text-muted-foreground">{Math.round(g.items.reduce((s, m) => s + (m.macros?.kcal || 0), 0))} kcal</span>
              </div>
              <ul className="divide-y divide-border">
                {g.items.map(m => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{Math.round(m.macros?.kcal || 0)} kcal · P {Math.round(m.macros?.prot || 0)} · G {Math.round(m.macros?.gluc || 0)} · L {Math.round(m.macros?.lip || 0)}</div>
                    </div>
                    <button onClick={() => removeMeal(m.id, today)} aria-label={`Supprimer ${m.name}`} className="k-press flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-[18px]" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* Semaine */}
      <SectionTitle right={<button onClick={() => { setDay(today); setTab('journal') }} className="flex items-center text-[13px] font-bold text-primary">Détails<ChevronRight className="size-4" /></button>}>Cette semaine</SectionTitle>
      <Card className="tone-nutri p-4">
        <div className="relative flex h-28 items-end gap-2">
          <div className="absolute inset-x-0 border-t border-dashed border-foreground/20" style={{ bottom: `${(goal / peak) * 100}%` }} />
          {week.map(w => {
            const isToday = w.d === today
            return (
              <div key={w.d} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cx('w-full rounded-t-lg transition-[height] duration-700', isToday ? 'bg-nutri' : w.kcal ? 'bg-nutri/35' : 'bg-muted')}
                    style={{ height: `${Math.max(4, (w.kcal / peak) * 100)}%` }}
                  />
                </div>
                <span className={cx('text-[10px] font-semibold', isToday ? 'text-foreground' : 'text-muted-foreground')}>{shortDay(w.d).slice(0, 1)}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Trait pointillé : votre objectif de {goal} kcal</p>
      </Card>
    </div>
  )
}
