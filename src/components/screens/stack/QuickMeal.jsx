'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { todayKey } from '@/lib/nutrition'
import { Button, Card, Field, Input, ScreenHeader } from '@/components/ui/primitives'
import { MealTypeChips, defaultMealType } from './ToolKit'

export default function QuickMeal() {
  const { addMeal, showToast } = useApp()
  const { back, home, day } = useNav()
  const [f, setF] = useState({ name: '', kcal: '', prot: '', gluc: '', lip: '' })
  const [mealType, setMealType] = useState(day === todayKey() ? defaultMealType() : 'dejeuner')
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }))
  const num = v => Math.max(0, Math.round(parseFloat(String(v).replace(',', '.')) || 0))

  const save = async () => {
    const kcal = num(f.kcal)
    if (!f.name.trim()) return showToast('Donnez un nom à ce repas.', 'error')
    if (!kcal || kcal > 5000) return showToast('Indiquez des calories entre 1 et 5000.', 'error')
    const meal = await addMeal({
      name: f.name.trim(), emoji: '🍽️', mealType, source: 'manual',
      macros: { kcal, prot: num(f.prot), gluc: num(f.gluc), lip: num(f.lip) },
    }, day)
    if (meal) { showToast('Repas ajouté', 'success'); home() }
  }

  return (
    <div className="tone-nutri">
      <ScreenHeader title="Saisie rapide" subtitle="Vous connaissez déjà les valeurs ? Entrez-les." onBack={back} />
      <Card className="space-y-4 p-5">
        <Field label="Nom du repas"><Input value={f.name} onChange={set('name')} placeholder="Ex : Sandwich jambon-beurre" maxLength={120} /></Field>
        <Field label="Calories (kcal)"><Input type="number" inputMode="numeric" value={f.kcal} onChange={set('kcal')} placeholder="450" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prot. (g)"><Input type="number" inputMode="decimal" value={f.prot} onChange={set('prot')} placeholder="0" /></Field>
          <Field label="Gluc. (g)"><Input type="number" inputMode="decimal" value={f.gluc} onChange={set('gluc')} placeholder="0" /></Field>
          <Field label="Lip. (g)"><Input type="number" inputMode="decimal" value={f.lip} onChange={set('lip')} placeholder="0" /></Field>
        </div>
      </Card>
      <div className="mt-4"><MealTypeChips value={mealType} onChange={setMealType} /></div>
      <Button size="lg" full className="mt-4" onClick={save}><Check className="size-5" />Ajouter au journal</Button>
    </div>
  )
}
