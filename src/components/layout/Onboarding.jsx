'use client'

import { useState } from 'react'
import { ChevronLeft, Flame, Scale, Dumbbell, Droplets, Check, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/AppContext'
import { GOALS, ACTIVITY_LEVELS, calculateProfile, suggestWaterGoal, fmtMl } from '@/lib/nutrition'
import { Button, Field, Input, Ring, CountUp, MacroBar, cx } from '@/components/ui/primitives'

const GOAL_ICONS = { seche: Flame, maintenance: Scale, masse: Dumbbell }
const STEPS = 4
const order = ['goal', 'body', 'activity', 'result']

function Choice({ active, onClick, icon: Icon, title, desc, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'k-press k-card flex w-full items-center gap-4 p-4 text-left transition-colors',
        active && '!border-tone ring-2 ring-tone/25 bg-tone-soft',
        disabled && 'opacity-45'
      )}
    >
      {Icon && (
        <span className={cx('flex size-12 shrink-0 items-center justify-center rounded-2xl', active ? 'bg-tone text-tone-fg' : 'bg-muted text-muted-foreground')}>
          <Icon className="size-6" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{desc}</span>
      </span>
      {active && <Check className="size-5 text-tone" />}
    </button>
  )
}

export default function Onboarding() {
  const { user, firstName, saveProfile, addWeight, setWaterGoal, showToast } = useApp()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(user?.user_metadata?.first_name || '')
  const [form, setForm] = useState({ goal: 'maintenance', gender: 'female', age: '', height: '', weight: '', activity: 1.375 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const age = Number(form.age)
  const minor = age > 0 && age < 18

  const validBody = () => {
    if (!(age >= 15 && age <= 100)) { showToast('Indiquez un âge entre 15 et 100 ans.', 'error'); return false }
    if (!(form.height >= 120 && form.height <= 230)) { showToast('Indiquez une taille entre 120 et 230 cm.', 'error'); return false }
    if (!(form.weight >= 30 && form.weight <= 300)) { showToast('Indiquez un poids entre 30 et 300 kg.', 'error'); return false }
    return true
  }

  const next = () => {
    if (order[step] === 'body' && !validBody()) return
    setStep(s => s + 1)
  }

  const plan = step === 3 ? calculateProfile(form) : null
  const water = step === 3 ? suggestWaterGoal(form.weight) : 0

  const finish = async () => {
    setSaving(true)
    const ok = await saveProfile(plan)
    if (ok) {
      await addWeight(Number(form.weight))
      await setWaterGoal(water)
      const trimmed = name.trim()
      if (trimmed && trimmed !== user?.user_metadata?.first_name) {
        await supabase.auth.updateUser({ data: { first_name: trimmed } })
      }
    }
    setSaving(false)
  }

  const current = order[step]

  const head = {
    goal: { t: `Bienvenue${firstName ? `, ${firstName}` : ''} !`, s: "Quel est votre objectif ? Vous pourrez le changer à tout moment." },
    body: { t: 'Parlons de vous', s: 'Ces informations servent uniquement à calculer vos besoins quotidiens.' },
    activity: { t: "Votre niveau d'activité", s: 'Au quotidien, en dehors des séances de sport ponctuelles.' },
    result: { t: 'Votre plan est prêt', s: 'Voici vos objectifs journaliers, calculés pour vous.' },
  }[current]

  return (
    <div className="tone-nutri fixed inset-0 flex flex-col bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 pb-2 pt-4">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          aria-label="Retour"
          className={cx('k-press flex size-10 items-center justify-center rounded-2xl border border-border bg-card', step === 0 && 'invisible')}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex flex-1 gap-1.5" aria-label={`Étape ${step + 1} sur ${STEPS}`}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors duration-500', i <= step ? 'bg-tone' : 'bg-muted')} />
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 pb-6 pt-4">
        <div key={step} className="k-enter">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">{head.t}</h1>
          <p className="mb-6 mt-1.5 text-[15px] text-muted-foreground">{head.s}</p>

          {current === 'goal' && (
            <div className="flex flex-col gap-3">
              {GOALS.map(g => (
                <Choice key={g.id} active={form.goal === g.id} onClick={() => set('goal', g.id)} icon={GOAL_ICONS[g.id]} title={g.label} desc={g.desc} />
              ))}
              <Field label="Prénom (facultatif)" className="mt-3">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Camille" maxLength={40} autoComplete="given-name" />
              </Field>
            </div>
          )}

          {current === 'body' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                {[['female', 'Femme'], ['male', 'Homme']].map(([v, l]) => (
                  <button key={v} onClick={() => set('gender', v)}
                    className={cx('k-press k-card py-4 text-[15px] font-semibold', form.gender === v && '!border-tone bg-tone-soft text-tone ring-2 ring-tone/25')}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Âge"><Input type="number" inputMode="numeric" value={form.age} onChange={e => set('age', e.target.value)} placeholder="30" /></Field>
                <Field label="Taille (cm)"><Input type="number" inputMode="numeric" value={form.height} onChange={e => set('height', e.target.value)} placeholder="172" /></Field>
                <Field label="Poids (kg)"><Input type="number" inputMode="decimal" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="68" /></Field>
              </div>
              {minor && form.goal === 'seche' && (
                <div className="flex gap-2.5 rounded-2xl bg-sport-soft p-3.5 text-[13px] leading-snug text-sport">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  Avant 18 ans, nous ne proposons pas de déficit calorique : votre plan sera calculé pour maintenir votre poids.
                </div>
              )}
            </div>
          )}

          {current === 'activity' && (
            <div className="flex flex-col gap-2.5">
              {ACTIVITY_LEVELS.map(a => (
                <Choice key={a.value} active={form.activity === a.value} onClick={() => set('activity', a.value)} title={a.label} desc={a.desc} />
              ))}
            </div>
          )}

          {current === 'result' && plan && (
            <div className="flex flex-col items-center">
              <Ring size={190} stroke={16} segments={[{ value: 1, max: 1, color: 'text-nutri' }]}>
                <CountUp value={plan.kcal} className="text-[44px] font-extrabold leading-none tracking-tight" />
                <span className="mt-1 text-sm font-medium text-muted-foreground">kcal par jour</span>
              </Ring>
              <div className="k-card mt-7 w-full space-y-4 p-5">
                <MacroBar label="Protéines" value={plan.prot} max={plan.prot} colorClass="bg-prot" />
                <MacroBar label="Glucides" value={plan.gluc} max={plan.gluc} colorClass="bg-gluc" />
                <MacroBar label="Lipides" value={plan.lip} max={plan.lip} colorClass="bg-lip" />
              </div>
              <div className="tone-water k-card mt-3 flex w-full items-center gap-3.5 p-4">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-tone-soft text-tone"><Droplets className="size-6" /></span>
                <div>
                  <div className="text-[15px] font-semibold">{fmtMl(water)} d'eau par jour</div>
                  <div className="text-[13px] text-muted-foreground">Environ 35 ml par kilo.</div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                Estimation indicative basée sur la formule de Mifflin-St Jeor. Elle ne remplace pas l'avis d'un médecin ou d'un diététicien.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-5 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
        {current !== 'result' ? (
          <Button size="lg" variant="tone" full onClick={next}>Continuer</Button>
        ) : (
          <Button size="lg" variant="primary" full loading={saving} onClick={finish}>C'est parti</Button>
        )}
      </div>
    </div>
  )
}
