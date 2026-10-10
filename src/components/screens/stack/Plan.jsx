'use client'

import { useState } from 'react'
import { Sparkles, RotateCcw, Plus, ShoppingCart, Lightbulb } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { askAI } from '@/lib/ai'
import { todayKey, GOALS } from '@/lib/nutrition'
import { Button, Card, Field, Input, ScreenHeader, Segmented } from '@/components/ui/primitives'
import { CreditNote, Thinking } from './ToolKit'

const MEALS = [['breakfast', '🌅 Petit-déjeuner', 'petit-dejeuner'], ['lunch', '🍽️ Déjeuner', 'dejeuner'], ['dinner', '🌙 Dîner', 'diner'], ['snack', '🍎 Collation', 'collation']]

export default function Plan() {
  const { checkCredits, showToast, profile, currentPlan, savePlan, addMeal } = useApp()
  const { back, day } = useNav()
  const [goal, setGoal] = useState(profile?.goal || 'maintenance')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(currentPlan)
  const [added, setAdded] = useState({})

  const generate = async () => {
    if (!checkCredits()) return
    setLoading(true); setPlan(null); setAdded({})
    try {
      const parsed = await askAI(`Tu es un diététicien expert. Crée un plan alimentaire complet sur 7 jours (lundi à dimanche).

Objectif : ${goal} (~${profile?.kcal || 2000} kcal/jour, ${profile?.prot || 120} g de protéines/jour)
${prefs.trim() ? 'Préférences : ' + prefs.trim().slice(0, 300) : ''}

Réponds UNIQUEMENT en JSON valide (pas de markdown), sois concis :
{"days":[{"day":"Lundi","breakfast":{"name":"Nom","kcal":400,"prot":20,"gluc":50,"lip":12},"lunch":{"name":"Nom","kcal":600,"prot":40,"gluc":60,"lip":18},"dinner":{"name":"Nom","kcal":500,"prot":35,"gluc":45,"lip":15},"snack":{"name":"Nom","kcal":200,"prot":10,"gluc":25,"lip":6},"totalKcal":1700}],"shoppingList":["item"],"tips":["conseil"]}`, 2500)
      setPlan(parsed)
      await savePlan(parsed)
    } catch (e) { if (!e.handled) showToast('La génération a échoué, réessayez.', 'error') }
    setLoading(false)
  }

  const add = async (m, type, key) => {
    const meal = await addMeal({ name: m.name, emoji: '🍽️', macros: { kcal: m.kcal, prot: m.prot, gluc: m.gluc, lip: m.lip }, mealType: type, source: 'plan' }, day === todayKey() ? day : day)
    if (meal) { setAdded(a => ({ ...a, [key]: true })); showToast(`${m.name} ajouté`, 'success') }
  }

  return (
    <div className="tone-coach">
      <ScreenHeader title="Plan 7 jours" subtitle="Un menu complet adapté à vos objectifs" onBack={back} />
      {loading ? <Thinking text="Votre diététicien prépare la semaine… (≈ 20 s)" /> : !plan ? (
        <div className="space-y-4">
          <Field label="Objectif"><Segmented value={goal} onChange={setGoal} options={GOALS.map(g => ({ id: g.id, label: g.short }))} /></Field>
          <Field label="Envies ou contraintes (facultatif)"><Input value={prefs} onChange={e => setPrefs(e.target.value)} maxLength={300} placeholder="Sans gluten, végétarien, méditerranéen…" /></Field>
          <Button size="lg" variant="tone" full onClick={generate}><Sparkles className="size-5" />Générer mon plan</Button>
          <CreditNote />
        </div>
      ) : (
        <div className="k-enter space-y-3">
          {plan.days?.map((d, i) => (
            <Card key={i} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[17px] font-bold">{d.day}</h3>
                <span className="rounded-full bg-tone-soft px-3 py-1 text-xs font-bold text-tone">{d.totalKcal} kcal</span>
              </div>
              <ul className="space-y-2">
                {MEALS.map(([k, label, type]) => d[k] && (
                  <li key={k} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
                      <div className="truncate text-[14px] font-semibold">{d[k].name}</div>
                      <div className="text-xs text-muted-foreground">{d[k].kcal} kcal · P {d[k].prot} · G {d[k].gluc} · L {d[k].lip}</div>
                    </div>
                    <button onClick={() => add(d[k], type, `${i}-${k}`)} disabled={added[`${i}-${k}`]} aria-label={`Ajouter ${d[k].name} au journal`}
                      className="k-press flex size-9 shrink-0 items-center justify-center rounded-full bg-tone-soft text-tone disabled:opacity-40">
                      <Plus className="size-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {plan.shoppingList?.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-[15px] font-bold"><ShoppingCart className="size-[18px] text-tone" />Liste de courses</div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">{plan.shoppingList.map((s, k) => <li key={k} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-tone" />{s}</li>)}</ul>
            </Card>
          )}
          {plan.tips?.length > 0 && <div className="space-y-1 rounded-3xl bg-tone-soft p-4 text-sm">{plan.tips.map((t, k) => <p key={k} className="flex gap-2"><Lightbulb className="mt-0.5 size-4 shrink-0 text-tone" />{t}</p>)}</div>}
          <Button variant="ghost" full onClick={() => setPlan(null)}><RotateCcw className="size-4" />Nouveau plan (1 crédit)</Button>
        </div>
      )}
    </div>
  )
}
