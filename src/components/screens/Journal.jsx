'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Plus, Minus, Dumbbell, Droplets, Target, TrendingDown, TrendingUp, Minus as Flat } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import {
  todayKey, addDays, relativeDay, dayTotals, MEAL_TYPES, mealTypeOf, weekDatesOf, shortDay,
  formatDay, parseKey, fmtMl, sumMacros,
} from '@/lib/nutrition'
import { Card, Segmented, SectionTitle, EmptyState, Button, Input, ProgressBar, MacroBar, cx } from '@/components/ui/primitives'

const TABS = [{ id: 'day', label: 'Jour' }, { id: 'week', label: 'Semaine' }, { id: 'weight', label: 'Poids' }]

export default function Journal() {
  const [view, setView] = useState('day')
  return (
    <div>
      <h1 className="mb-4 text-[28px] font-bold leading-tight tracking-tight">Journal</h1>
      <Segmented options={TABS} value={view} onChange={setView} className="mb-5" />
      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'weight' && <WeightView />}
    </div>
  )
}

// ---------------------------------------------------------------- Jour
function DayView() {
  const { profile, dailyMeals, dailySport, dailyWater, waterGoal, removeMeal, removeSport, addWater, setWater } = useApp()
  const { day, setDay, openAdd, go } = useNav()
  const t = dayTotals({ dailyMeals, dailySport, dailyWater }, day)
  const isToday = day === todayKey()
  const remaining = profile.kcal - t.eaten + t.burned
  const groups = MEAL_TYPES.map(mt => ({ ...mt, items: t.meals.filter(m => mealTypeOf(m) === mt.id) }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setDay(addDays(day, -1))} aria-label="Jour précédent" className="k-press flex size-11 items-center justify-center rounded-2xl border border-border bg-card"><ChevronLeft className="size-5" /></button>
        <label className="relative flex-1 text-center">
          <span className="block text-[17px] font-bold">{relativeDay(day)}</span>
          <span className="block text-xs text-muted-foreground">{isToday ? formatDay(day) : formatDay(day, false)}</span>
          <input type="date" value={day} max={todayKey()} onChange={e => e.target.value && setDay(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Choisir une date" />
        </label>
        <button onClick={() => setDay(addDays(day, 1))} disabled={isToday} aria-label="Jour suivant" className="k-press flex size-11 items-center justify-center rounded-2xl border border-border bg-card disabled:opacity-30"><ChevronRight className="size-5" /></button>
      </div>

      <Card className="tone-nutri p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-extrabold leading-none">{Math.round(t.eaten)}<span className="ml-1.5 text-sm font-semibold text-muted-foreground">/ {profile.kcal + Math.round(t.burned)} kcal</span></div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              {remaining >= 0 ? `Il reste ${Math.round(remaining)} kcal` : `${Math.abs(Math.round(remaining))} kcal au-dessus de l'objectif`}
              {t.burned > 0 && ` · dont ${Math.round(t.burned)} brûlées`}
            </div>
          </div>
        </div>
        <ProgressBar value={t.eaten} max={profile.kcal + t.burned} colorClass={remaining < 0 ? 'bg-destructive' : 'bg-tone'} className="mt-3" height="h-3" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <MacroBar label="Prot." value={t.macros.prot} max={profile.prot} colorClass="bg-prot" />
          <MacroBar label="Gluc." value={t.macros.gluc} max={profile.gluc} colorClass="bg-gluc" />
          <MacroBar label="Lip." value={t.macros.lip} max={profile.lip} colorClass="bg-lip" />
        </div>
      </Card>

      {groups.map(g => (
        <Card key={g.id} className="tone-nutri p-4">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold">{g.emoji} {g.label}</span>
            <div className="flex items-center gap-3">
              {g.items.length > 0 && <span className="text-xs font-semibold text-muted-foreground">{Math.round(g.items.reduce((s, m) => s + (m.macros?.kcal || 0), 0))} kcal</span>}
              <button onClick={() => openAdd('meal')} aria-label={`Ajouter au ${g.label}`} className="k-press flex size-8 items-center justify-center rounded-full bg-tone-soft text-tone"><Plus className="size-[18px]" /></button>
            </div>
          </div>
          {g.items.length > 0 && (
            <ul className="mt-2 divide-y divide-border">
              {g.items.map(m => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{Math.round(m.macros?.kcal || 0)} kcal · P {Math.round(m.macros?.prot || 0)} · G {Math.round(m.macros?.gluc || 0)} · L {Math.round(m.macros?.lip || 0)}</div>
                  </div>
                  <button onClick={() => removeMeal(m.id, day)} aria-label={`Supprimer ${m.name}`} className="k-press flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-[18px]" /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      <Card className="tone-sport p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[15px] font-bold"><Dumbbell className="size-[18px] text-tone" />Sport</span>
          <div className="flex items-center gap-3">
            {t.burned > 0 && <span className="text-xs font-semibold text-muted-foreground">{Math.round(t.burned)} kcal</span>}
            <button onClick={() => go('sport-add')} aria-label="Ajouter une activité" className="k-press flex size-8 items-center justify-center rounded-full bg-tone-soft text-tone"><Plus className="size-[18px]" /></button>
          </div>
        </div>
        {t.sports.length > 0 ? (
          <ul className="mt-2 divide-y divide-border">
            {t.sports.map(s => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="text-2xl">{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.duration} min · {Math.round(s.kcal)} kcal</div>
                </div>
                <button onClick={() => removeSport(s.id, day)} aria-label={`Supprimer ${s.name}`} className="k-press flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-[18px]" /></button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1.5 text-[13px] text-muted-foreground">Aucune activité ce jour-là.</p>}
      </Card>

      <Card className="tone-water p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[15px] font-bold"><Droplets className="size-[18px] text-tone" />Hydratation</span>
          <span className="text-xs font-semibold text-muted-foreground">{fmtMl(t.water)} / {fmtMl(waterGoal)}</span>
        </div>
        <ProgressBar value={t.water} max={waterGoal} className="mt-3" height="h-3" />
        <div className="mt-3 flex items-center justify-between gap-2">
          <button onClick={() => setWater(Math.max(0, t.water - 250), day)} disabled={t.water <= 0} aria-label="Retirer 250 ml" className="k-press flex size-11 items-center justify-center rounded-2xl bg-muted disabled:opacity-40"><Minus className="size-5" /></button>
          <span className="text-sm font-semibold text-muted-foreground">par pas de 250 ml</span>
          <button onClick={() => addWater(250, day)} aria-label="Ajouter 250 ml" className="k-press flex size-11 items-center justify-center rounded-2xl bg-tone text-tone-fg"><Plus className="size-5" /></button>
        </div>
      </Card>
    </div>
  )
}

// ------------------------------------------------------------- Semaine
function WeekView() {
  const { profile, dailyMeals, dailySport, dailyWater, waterGoal } = useApp()
  const [offset, setOffset] = useState(0)
  const anchor = addDays(todayKey(), offset * 7)
  const dates = weekDatesOf(anchor)
  const today = todayKey()

  const days = dates.map(d => ({ d, ...dayTotals({ dailyMeals, dailySport, dailyWater }, d) }))
  const logged = days.filter(x => x.meals.length > 0)
  const n = Math.max(1, logged.length)
  const sum = sumMacros(days.flatMap(x => x.meals))
  const burned = days.reduce((s, x) => s + x.burned, 0)
  const sessions = days.reduce((s, x) => s + x.sports.length, 0)
  const minutes = days.reduce((s, x) => s + x.sports.reduce((a, b) => a + b.duration, 0), 0)
  const waterDays = days.filter(x => x.water > 0)
  const avgWater = waterDays.length ? waterDays.reduce((s, x) => s + x.water, 0) / waterDays.length : 0
  const goalDays = logged.filter(x => Math.abs(x.net - profile.kcal) <= profile.kcal * 0.1).length
  const peak = Math.max(profile.kcal, ...days.map(x => x.eaten), 1)
  const label = `${formatDay(dates[0], false)} – ${formatDay(dates[6], false)}`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOffset(o => o - 1)} aria-label="Semaine précédente" className="k-press flex size-11 items-center justify-center rounded-2xl border border-border bg-card"><ChevronLeft className="size-5" /></button>
        <div className="text-center">
          <div className="text-[17px] font-bold">{offset === 0 ? 'Cette semaine' : offset === -1 ? 'Semaine dernière' : 'Semaine du ' + formatDay(dates[0], false)}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        <button onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset === 0} aria-label="Semaine suivante" className="k-press flex size-11 items-center justify-center rounded-2xl border border-border bg-card disabled:opacity-30"><ChevronRight className="size-5" /></button>
      </div>

      <Card className="tone-nutri p-4">
        <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Calories par jour</div>
        <div className="relative flex h-36 items-end gap-2">
          <div className="absolute inset-x-0 border-t border-dashed border-foreground/25" style={{ bottom: `${(profile.kcal / peak) * 100}%` }} />
          {days.map(x => (
            <div key={x.d} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">{x.eaten ? Math.round(x.eaten / 10) / 100 + 'k' : ''}</span>
              <div className="flex w-full flex-1 items-end">
                <div className={cx('w-full rounded-t-lg', x.d === today ? 'bg-nutri' : x.eaten ? 'bg-nutri/45' : 'bg-muted')} style={{ height: `${Math.max(4, (x.eaten / peak) * 100)}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">{shortDay(x.d).slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Pointillé : objectif de {profile.kcal} kcal</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="tone-nutri p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Moyenne</div>
          <div className="mt-1 text-2xl font-extrabold">{Math.round(sum.kcal / n)}<span className="ml-1 text-xs font-semibold text-muted-foreground">kcal/j</span></div>
          <div className="mt-1 text-xs text-muted-foreground">sur {logged.length} jour{logged.length > 1 ? 's' : ''} saisi{logged.length > 1 ? 's' : ''}</div>
        </Card>
        <Card className="tone-nutri p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dans l'objectif</div>
          <div className="mt-1 text-2xl font-extrabold">{goalDays}<span className="ml-1 text-xs font-semibold text-muted-foreground">/ {logged.length} j</span></div>
          <div className="mt-1 text-xs text-muted-foreground">à ± 10 % de votre cible</div>
        </Card>
        <Card className="tone-sport p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sport</div>
          <div className="mt-1 text-2xl font-extrabold">{sessions}<span className="ml-1 text-xs font-semibold text-muted-foreground">séance{sessions > 1 ? 's' : ''}</span></div>
          <div className="mt-1 text-xs text-muted-foreground">{minutes} min · {Math.round(burned)} kcal brûlées</div>
        </Card>
        <Card className="tone-water p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eau</div>
          <div className="mt-1 text-2xl font-extrabold">{fmtMl(Math.round(avgWater))}<span className="ml-1 text-xs font-semibold text-muted-foreground">/j</span></div>
          <div className="mt-1 text-xs text-muted-foreground">objectif {fmtMl(waterGoal)}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Macros moyennes par jour</div>
        <div className="space-y-3.5">
          <MacroBar label="Protéines" value={sum.prot / n} max={profile.prot} colorClass="bg-prot" />
          <MacroBar label="Glucides" value={sum.gluc / n} max={profile.gluc} colorClass="bg-gluc" />
          <MacroBar label="Lipides" value={sum.lip / n} max={profile.lip} colorClass="bg-lip" />
        </div>
      </Card>

      {logged.length === 0 && <EmptyState icon={Target} title="Rien de saisi cette semaine" text="Enregistrez vos repas pour voir apparaître votre bilan." />}
    </div>
  )
}

// --------------------------------------------------------------- Poids
function WeightChart({ entries, target }) {
  const pts = entries.slice(-30)
  if (pts.length < 2) return null
  const W = 320, H = 130, P = 14
  const ws = pts.map(p => p.weight).concat(target ? [target] : [])
  const min = Math.min(...ws) - 1, max = Math.max(...ws) + 1
  const x = i => P + (i / (pts.length - 1)) * (W - 2 * P)
  const y = w => H - P - ((w - min) / (max - min)) * (H - 2 * P)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.weight).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" role="img" aria-label="Évolution du poids">
      {target && <line x1={P} x2={W - P} y1={y(target)} y2={y(target)} className="stroke-tone/50" strokeDasharray="4 4" />}
      <path d={`${d} L${x(pts.length - 1)} ${H - P} L${x(0)} ${H - P} Z`} className="fill-tone/10" />
      <path d={d} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-tone" />
      {pts.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.weight)} r={i === pts.length - 1 ? 5 : 3} className="fill-tone" />)}
    </svg>
  )
}

function WeightView() {
  const { weightEntries, weightGoal, profile, addWeight, removeWeight, saveWeightGoal, showToast } = useApp()
  const [value, setValue] = useState('')
  const [goalValue, setGoalValue] = useState('')
  const [editGoal, setEditGoal] = useState(false)
  const entries = useMemo(() => [...(weightEntries || [])].sort((a, b) => a.date.localeCompare(b.date)), [weightEntries])
  const last = entries[entries.length - 1]
  const first = entries[0]
  const current = last?.weight ?? profile.weight
  const delta = last && first && entries.length > 1 ? last.weight - first.weight : 0
  const target = weightGoal?.targetWeight
  const start = weightGoal?.startWeight ?? first?.weight ?? current
  const progress = target && start !== target ? Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100)) : 0
  const Trend = delta < -0.05 ? TrendingDown : delta > 0.05 ? TrendingUp : Flat

  const save = async () => {
    const w = parseFloat(value.replace(',', '.'))
    if (!w || w < 25 || w > 350) return showToast('Entrez un poids valide (en kg)', 'error')
    await addWeight(w)
    setValue('')
    showToast('Pesée enregistrée', 'success')
  }
  const saveGoal = async () => {
    const g = parseFloat(goalValue.replace(',', '.'))
    if (!g || g < 30 || g > 300) return showToast('Entrez un poids cible valide', 'error')
    await saveWeightGoal({ targetWeight: g, weeks: weightGoal?.weeks || 8, startDate: todayKey(), startWeight: current })
    setEditGoal(false); setGoalValue('')
    showToast('Objectif enregistré', 'success')
  }

  return (
    <div className="tone-weight space-y-3">
      <Card className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Poids actuel</div>
            <div className="text-[40px] font-extrabold leading-none tracking-tight">{current}<span className="ml-1 text-base font-semibold text-muted-foreground">kg</span></div>
          </div>
          {entries.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-full bg-tone-soft px-3 py-1.5 text-sm font-bold text-tone">
              <Trend className="size-4" />{delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
            </div>
          )}
        </div>
        <WeightChart entries={entries} target={target} />
        {entries.length < 2 && <p className="mt-3 text-[13px] text-muted-foreground">Ajoutez au moins deux pesées pour voir la courbe.</p>}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[15px] font-bold"><Target className="size-[18px] text-tone" />Objectif</span>
          <button onClick={() => setEditGoal(e => !e)} className="text-[13px] font-bold text-primary">{target ? 'Modifier' : 'Définir'}</button>
        </div>
        {target && !editGoal && (
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted-foreground"><span>{start} kg</span><span>{target} kg</span></div>
            <ProgressBar value={progress} max={100} height="h-3" />
            <p className="mt-2 text-[13px] text-muted-foreground">{Math.abs(current - target).toFixed(1)} kg {current > target ? 'à perdre' : current < target ? 'à prendre' : '— objectif atteint !'}</p>
          </div>
        )}
        {(editGoal || !target) && (
          <div className="mt-3 flex gap-2.5">
            <Input type="text" inputMode="decimal" placeholder="Poids cible (kg)" value={goalValue} onChange={e => setGoalValue(e.target.value)} />
            <Button variant="tone" onClick={saveGoal} disabled={!goalValue}>OK</Button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-[15px] font-bold">Nouvelle pesée</div>
        <div className="flex gap-2.5">
          <Input type="text" inputMode="decimal" placeholder="Ex : 72,5" value={value} onChange={e => setValue(e.target.value)} />
          <Button variant="tone" onClick={save} disabled={!value}>Ajouter</Button>
        </div>
      </Card>

      {entries.length > 0 && (
        <Card className="p-4">
          <div className="mb-1 text-[15px] font-bold">Historique</div>
          <ul className="divide-y divide-border">
            {[...entries].reverse().slice(0, 12).map(e => (
              <li key={e.date} className="flex items-center justify-between py-2.5">
                <span className="text-[14px] text-muted-foreground">{formatDay(e.date)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-[15px] font-bold">{e.weight} kg</span>
                  <button onClick={() => removeWeight(e.date)} aria-label="Supprimer cette pesée" className="k-press flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
