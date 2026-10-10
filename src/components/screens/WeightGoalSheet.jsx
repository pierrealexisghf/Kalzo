'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, Info, CalendarCheck } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import {
  todayKey, planWeightGoal, calculateProfile, nearestActivity, GOAL_DURATIONS, formatDay, addDays,
} from '@/lib/nutrition'
import { Sheet, Button, Field, Input, Chip, cx } from '@/components/ui/primitives'

const kg = n => `${Math.abs(n).toFixed(1).replace('.', ',')} kg`

// Définir (ou modifier) l'objectif de poids : cible + durée. L'adaptation des
// calories est un choix, désactivé par défaut pour qui ne saisit pas ses repas.
export default function WeightGoalSheet({ open, onClose, current, existing }) {
  const { profile, dailyMeals, saveProfile, saveWeightGoal, showToast } = useApp()
  const tracksMeals = useMemo(() => {
    let days = 0
    for (let i = 0; i < 7; i++) if (dailyMeals[addDays(todayKey(), -i)]?.length) days++
    return days >= 3
  }, [dailyMeals])

  const [target, setTarget] = useState(existing?.targetWeight ? String(existing.targetWeight).replace('.', ',') : '')
  const [weeks, setWeeks] = useState(existing?.v === 2 ? existing.weeks : 12)
  const [adapt, setAdapt] = useState(existing?.v === 2 ? !!existing.adaptCalories : tracksMeals)
  const [saving, setSaving] = useState(false)

  const targetNum = parseFloat(target.replace(',', '.'))
  const plan = planWeightGoal({
    current, target: targetNum, weeks, gender: profile.gender, age: profile.age,
    activity: nearestActivity(profile.activity), height: profile.height,
  })
  const valid = plan.status === 'ok' && targetNum >= 30 && targetNum <= 300
  const dir = plan.direction === 'seche' ? 'perdre' : 'prendre'

  const save = async () => {
    if (!valid) return
    setSaving(true)
    const goal = {
      v: 2, targetWeight: targetNum, weeks, startDate: todayKey(), startWeight: current,
      adaptCalories: adapt, dailyDelta: plan.dailyDelta || 0,
    }
    await saveWeightGoal(goal)
    const common = { ...profile, weight: current, activity: nearestActivity(profile.activity) }
    if (adapt) {
      await saveProfile(calculateProfile({ ...common, goal: plan.direction, kcalOverride: plan.kcalTarget ?? plan.tdee }))
    } else if (existing?.adaptCalories) {
      // On quitte l'adaptation : retour au calcul standard de l'objectif du profil.
      await saveProfile(calculateProfile(common))
    }
    setSaving(false)
    showToast(adapt ? 'Objectif enregistré, calories ajustées' : 'Objectif enregistré', 'success')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Objectif de poids">
      <div className="tone-weight space-y-4">
        <p className="text-sm text-muted-foreground">Poids actuel : <strong className="text-foreground">{kg(current)}</strong></p>

        <Field label="Poids cible (kg)">
          <Input type="text" inputMode="decimal" placeholder="Ex : 68" value={target} onChange={e => setTarget(e.target.value)} />
        </Field>

        <div>
          <div className="k-label">En combien de temps ?</div>
          <div className="-mx-1 flex flex-wrap gap-2 px-1">
            {GOAL_DURATIONS.map(w => <Chip key={w} active={weeks === w} onClick={() => setWeeks(w)}>{w} sem.</Chip>)}
          </div>
          <Input type="number" inputMode="numeric" value={weeks} className="mt-2.5" aria-label="Durée personnalisée en semaines"
            onChange={e => setWeeks(Math.min(104, Math.max(1, parseInt(e.target.value) || 1)))} />
        </div>

        {targetNum > 0 && plan.status !== 'invalid' && (
          <div className="k-enter space-y-3">
            {plan.status === 'minor' && (
              <div className="flex gap-2.5 rounded-2xl bg-sport-soft p-3.5 text-[13px] text-sport"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Avant 18 ans, aucun objectif de perte de poids n'est proposé. Parle-en à un médecin si tu te poses des questions.</div>
            )}
            {(plan.status === 'too_fast' || plan.status === 'floor') && (
              <div className="rounded-2xl bg-sport-soft p-3.5 text-[13px] text-sport">
                <div className="flex gap-2.5"><AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {plan.status === 'too_fast'
                      ? <>Rythme trop rapide ({plan.weeklyRate.toFixed(1).replace('.', ',')} kg par semaine, au-delà du plafond recommandé d'environ {plan.maxRate.toFixed(1).replace('.', ',')} kg).</>
                      : <>Pour tenir cette échéance, il faudrait descendre sous {profile.gender === 'male' ? '1 500' : '1 200'} kcal par jour, ce qui n'est pas recommandé.</>}
                    {plan.suggestWeeks ? <> Choisis au moins <strong>{plan.suggestWeeks} semaines</strong>.</> : <> Cet objectif n'est pas réalisable en sécurité.</>}
                  </span>
                </div>
                {plan.suggestWeeks && <button onClick={() => setWeeks(plan.suggestWeeks)} className="mt-2.5 rounded-full bg-sport px-3.5 py-1.5 text-xs font-bold text-white">Utiliser {plan.suggestWeeks} semaines</button>}
              </div>
            )}
            {plan.status === 'ok' && (
              <div className="rounded-2xl bg-tone-soft p-4">
                <div className="flex items-center gap-2 text-[15px] font-bold text-tone"><CalendarCheck className="size-5" />{plan.direction === 'maintenance' ? 'Maintenir ton poids' : `${dir.charAt(0).toUpperCase() + dir.slice(1)} ${kg(plan.delta)}`}</div>
                {plan.direction !== 'maintenance' && <p className="mt-1.5 text-[13px] text-foreground/80">Soit environ <strong>{plan.weeklyRate.toFixed(2).replace('.', ',')} kg par semaine</strong>, arrivée le <strong>{formatDay(plan.end, false)}</strong>.</p>}
              </div>
            )}
          </div>
        )}

        {plan.status === 'ok' && plan.direction !== 'maintenance' && (
          <label className={cx('k-card flex cursor-pointer items-start gap-3 p-4', adapt && '!border-tone ring-2 ring-tone/20')}>
            <input type="checkbox" checked={adapt} onChange={e => setAdapt(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[hsl(var(--primary))]" />
            <span className="text-[13px] leading-snug">
              <span className="block text-[15px] font-semibold">Adapter mon objectif de calories</span>
              {adapt
                ? <span className="mt-1 block text-muted-foreground">Ton objectif passera de <strong className="text-foreground">{profile.kcal}</strong> à <strong className="text-foreground">{plan.kcalTarget} kcal/jour</strong>. Utile si tu enregistres tes repas.</span>
                : <span className="mt-1 block text-muted-foreground">Tes calories ne changent pas : l'objectif sert de repère, comparé à tes pesées.</span>}
            </span>
          </label>
        )}

        <div className="flex gap-2 rounded-2xl bg-muted p-3 text-xs text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" />Estimation indicative, qui ne remplace pas l'avis d'un médecin ou d'un diététicien. Le résultat réel dépend de ton alimentation et de ton activité.</div>

        <Button size="lg" variant="tone" full disabled={!valid} loading={saving} onClick={save}>Enregistrer l'objectif</Button>
      </div>
    </Sheet>
  )
}
