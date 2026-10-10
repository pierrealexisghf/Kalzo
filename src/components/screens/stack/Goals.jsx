'use client'

import { useState } from 'react'
import { Check, Droplets, Flame, Scale, Dumbbell, Info } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { GOALS, ACTIVITY_LEVELS, nearestActivity, calculateProfile, suggestWaterGoal, fmtMl } from '@/lib/nutrition'
import { Button, Card, Field, Input, ScreenHeader, SectionTitle, Segmented, MacroBar, cx } from '@/components/ui/primitives'

const ICONS = { seche: Flame, maintenance: Scale, masse: Dumbbell }

export default function Goals() {
  const { profile, saveProfile, waterGoal, setWaterGoal, weightGoal, showToast } = useApp()
  const { back } = useNav()
  const [f, setF] = useState({
    goal: profile.goal || 'maintenance', gender: profile.gender || 'female', age: String(profile.age || ''),
    height: String(profile.height || ''), weight: String(profile.weight || ''), activity: nearestActivity(profile.activity),
  })
  const [water, setWater] = useState(String(waterGoal))
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const valid = f.age >= 15 && f.age <= 100 && f.height >= 120 && f.height <= 230 && f.weight >= 30 && f.weight <= 300
  // Si un objectif de poids pilote les calories, la cible reste celle de l'échéance choisie.
  const adaptive = weightGoal?.v === 2 && weightGoal.adaptCalories
  const override = adaptive && valid ? calculateProfile({ ...f, goal: 'maintenance' }).tdee + (weightGoal.dailyDelta || 0) : undefined
  const preview = valid ? calculateProfile({ ...f, kcalOverride: override }) : null
  const minor = Number(f.age) > 0 && Number(f.age) < 18

  const save = async () => {
    if (!valid) return showToast('Vérifiez âge, taille et poids.', 'error')
    const w = parseInt(water)
    if (!(w >= 500 && w <= 10000)) return showToast("Objectif d'eau entre 500 ml et 10 000 ml.", 'error')
    const ok = await saveProfile(preview)
    if (ok) { await setWaterGoal(w); showToast('Objectifs mis à jour', 'success'); back() }
  }

  return (
    <div className="tone-nutri">
      <ScreenHeader title="Mes objectifs" subtitle="Calculés à partir de votre profil" onBack={back} />

      {adaptive ? (
        <div className="tone-weight flex gap-3 rounded-3xl bg-tone-soft p-4 text-[13px] leading-snug">
          <Info className="mt-0.5 size-4 shrink-0 text-tone" />
          <span>Vos calories suivent votre <strong>objectif de poids</strong> ({weightGoal.targetWeight} kg en {weightGoal.weeks} semaines). Pour les modifier, changez l'objectif dans Journal → Poids.</span>
        </div>
      ) : (
        <>
      <SectionTitle className="!mt-0">Objectif</SectionTitle>
      <div className="space-y-2.5">
        {GOALS.map(g => {
          const Icon = ICONS[g.id]
          const active = f.goal === g.id
          return (
            <button key={g.id} onClick={() => set('goal', g.id)} className={cx('k-press k-card flex w-full items-center gap-4 p-4 text-left', active && '!border-tone bg-tone-soft ring-2 ring-tone/25')}>
              <span className={cx('flex size-11 items-center justify-center rounded-2xl', active ? 'bg-tone text-tone-fg' : 'bg-muted text-muted-foreground')}><Icon className="size-6" /></span>
              <span className="flex-1"><span className="block text-[15px] font-semibold">{g.label}</span><span className="block text-[13px] text-muted-foreground">{g.desc}</span></span>
              {active && <Check className="size-5 text-tone" />}
            </button>
          )
        })}
      </div>
      {minor && f.goal === 'seche' && <div className="mt-3 flex gap-2.5 rounded-2xl bg-sport-soft p-3.5 text-[13px] text-sport"><Info className="mt-0.5 size-4 shrink-0" />Avant 18 ans, aucun déficit calorique n'est proposé.</div>}

        </>
      )}

      <SectionTitle>Profil</SectionTitle>
      <Card className="space-y-4 p-5">
        <Segmented value={f.gender} onChange={v => set('gender', v)} options={[{ id: 'female', label: 'Femme' }, { id: 'male', label: 'Homme' }]} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Âge"><Input type="number" inputMode="numeric" value={f.age} onChange={e => set('age', e.target.value)} /></Field>
          <Field label="Taille (cm)"><Input type="number" inputMode="numeric" value={f.height} onChange={e => set('height', e.target.value)} /></Field>
          <Field label="Poids (kg)"><Input type="number" inputMode="decimal" value={f.weight} onChange={e => set('weight', e.target.value)} /></Field>
        </div>
      </Card>

      <SectionTitle>Votre quotidien (hors sport)</SectionTitle>
      <div className="space-y-2">
        {ACTIVITY_LEVELS.map(a => (
          <button key={a.value} onClick={() => set('activity', a.value)} className={cx('k-press k-card flex w-full items-center justify-between p-3.5 text-left', f.activity === a.value && '!border-tone bg-tone-soft ring-2 ring-tone/25')}>
            <span><span className="block text-[14px] font-semibold">{a.label}</span><span className="block text-xs text-muted-foreground">{a.desc}</span></span>
            {f.activity === a.value && <Check className="size-5 text-tone" />}
          </button>
        ))}
      </div>
      <p className="mt-2.5 px-1 text-xs text-muted-foreground">Le sport n'est pas compris ici : ajoutez vos séances dans l'app, leurs calories s'ajoutent à votre budget du jour.</p>

      <SectionTitle>Hydratation</SectionTitle>
      <Card className="tone-water p-5">
        <div className="flex items-center gap-3">
          <Droplets className="size-6 text-tone" />
          <div className="flex-1"><Field label="Objectif quotidien (ml)"><Input type="number" inputMode="numeric" value={water} onChange={e => setWater(e.target.value)} /></Field></div>
        </div>
        {valid && <button onClick={() => setWater(String(suggestWaterGoal(f.weight)))} className="mt-3 text-[13px] font-semibold text-tone">Suggestion pour vous : {fmtMl(suggestWaterGoal(f.weight))}</button>}
      </Card>

      {preview && (
        <Card className="k-enter mt-5 p-5">
          <div className="flex items-baseline justify-between"><span className="k-label !mb-0">Votre cible</span><span className="text-2xl font-extrabold">{preview.kcal} <span className="text-sm font-semibold text-muted-foreground">kcal/j</span></span></div>
          <div className="mt-4 space-y-3">
            <MacroBar label="Protéines" value={preview.prot} max={preview.prot} colorClass="bg-prot" />
            <MacroBar label="Glucides" value={preview.gluc} max={preview.gluc} colorClass="bg-gluc" />
            <MacroBar label="Lipides" value={preview.lip} max={preview.lip} colorClass="bg-lip" />
          </div>
        </Card>
      )}
      <Button size="lg" full className="mt-5" onClick={save} disabled={!valid}><Check className="size-5" />Enregistrer</Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">Estimation indicative (formule de Mifflin-St Jeor), qui ne remplace pas un avis médical.</p>
    </div>
  )
}
