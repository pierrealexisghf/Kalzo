'use client'

import { useState } from 'react'
import { Sparkles, Clock, Lightbulb, RotateCcw, Check } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { askAI } from '@/lib/ai'
import { todayKey } from '@/lib/nutrition'
import { Button, Card, Field, Input, Textarea, ScreenHeader, MacroPills } from '@/components/ui/primitives'
import { MealTypeChips, CreditNote, Thinking, defaultMealType } from './ToolKit'

export default function Frigo() {
  const { checkCredits, addMeal, showToast, profile } = useApp()
  const { back, home, day } = useNav()
  const [ingredients, setIngredients] = useState('')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [mealType, setMealType] = useState(day === todayKey() ? defaultMealType() : 'dejeuner')

  const generate = async () => {
    if (!ingredients.trim()) return showToast('Listez les ingrédients que vous avez.', 'error')
    if (!checkCredits()) return
    setLoading(true); setResult(null)
    try {
      setResult(await askAI(`Tu es un chef cuisinier expert en nutrition. Crée une recette originale et délicieuse avec ces ingrédients disponibles : ${ingredients.trim().slice(0, 800)}. ${prefs.trim() ? 'Préférences : ' + prefs.trim().slice(0, 300) + '.' : ''}
${profile?.kcal ? `Objectif de l'utilisateur : environ ${profile.kcal} kcal par jour, ${profile.prot} g de protéines.` : ''}

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec ce format exact :
{
  "name": "Nom de la recette",
  "emoji": "🍳",
  "time": 20,
  "ingredients": ["200 g de poulet", "100 g de riz"],
  "steps": ["Étape 1…", "Étape 2…"],
  "macros": {"kcal": 450, "prot": 35, "gluc": 40, "lip": 12},
  "tip": "Astuce du chef"
}`, 1200))
    } catch (e) { if (!e.handled) showToast("La génération a échoué, réessayez.", 'error') }
    setLoading(false)
  }

  const add = async () => {
    const meal = await addMeal({ name: result.name, emoji: result.emoji || '🍳', macros: result.macros, mainIngredients: result.ingredients?.slice(0, 8), mealType, source: 'ai-recipe' }, day)
    if (meal) { showToast(`${result.name} ajouté au journal`, 'success'); home() }
  }

  return (
    <div className="tone-coach">
      <ScreenHeader title="Frigo Vide" subtitle="Une recette avec ce que vous avez déjà" onBack={back} />
      {loading ? <Thinking text="Votre chef invente une recette…" /> : !result ? (
        <div className="space-y-4">
          <Field label="Vos ingrédients"><Textarea rows={4} value={ingredients} onChange={e => setIngredients(e.target.value)} maxLength={800} placeholder="Poulet, riz, tomates, oignons, courgettes…" /></Field>
          <Field label="Envies ou contraintes (facultatif)"><Input value={prefs} onChange={e => setPrefs(e.target.value)} maxLength={300} placeholder="Sans gluten, rapide, végétarien…" /></Field>
          <Button size="lg" variant="tone" full onClick={generate}><Sparkles className="size-5" />Générer une recette</Button>
          <CreditNote />
        </div>
      ) : (
        <div className="k-enter space-y-3">
          <Card className="p-5">
            <div className="text-5xl">{result.emoji}</div>
            <h2 className="mt-2 text-2xl font-bold leading-tight">{result.name}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="size-4" />{result.time} min</div>
            <MacroPills macros={result.macros} className="mt-4" />
          </Card>
          <Card className="p-5">
            <div className="k-label">Ingrédients</div>
            <ul className="space-y-1.5 text-sm">{result.ingredients?.map((i, k) => <li key={k} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-tone" />{i}</li>)}</ul>
          </Card>
          <Card className="p-5">
            <div className="k-label">Préparation</div>
            <ol className="space-y-3">{result.steps?.map((s, k) => (
              <li key={k} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-tone-soft text-xs font-bold text-tone">{k + 1}</span>{s}
              </li>))}
            </ol>
          </Card>
          {result.tip && <div className="flex gap-2.5 rounded-3xl bg-tone-soft p-4 text-sm"><Lightbulb className="mt-0.5 size-4 shrink-0 text-tone" /><span>{result.tip}</span></div>}
          <MealTypeChips value={mealType} onChange={setMealType} />
          <Button size="lg" variant="primary" full onClick={add}><Check className="size-5" />Ajouter au journal</Button>
          <Button variant="ghost" full onClick={() => setResult(null)}><RotateCcw className="size-4" />Une autre recette</Button>
        </div>
      )}
    </div>
  )
}
