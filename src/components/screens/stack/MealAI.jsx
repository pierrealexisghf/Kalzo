'use client'

import { useState } from 'react'
import { Sparkles, Lightbulb, RotateCcw, Check } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { askAI } from '@/lib/ai'
import { todayKey } from '@/lib/nutrition'
import { Button, Card, Field, Textarea, ScreenHeader, MacroPills, Input, Chip } from '@/components/ui/primitives'
import { PhotoPicker, MealTypeChips, CreditNote, Thinking, defaultMealType } from './ToolKit'

const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export default function MealAI() {
  const { checkCredits, addMeal, showToast } = useApp()
  const { back, home, day } = useNav()
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [mealType, setMealType] = useState(day === todayKey() ? defaultMealType() : 'dejeuner')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [portion, setPortion] = useState(1)
  const [name, setName] = useState('')

  const analyze = async () => {
    if (!text.trim() && !photo) return showToast('Décrivez votre repas ou prenez-le en photo.', 'error')
    if (!checkCredits()) return
    setLoading(true)
    setResult(null)
    try {
      const content = []
      if (photo) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photo.base64 } })
      content.push({
        type: 'text',
        text: `Analyse ce repas et estime ses valeurs nutritionnelles pour la portion décrite ou visible.
${text.trim() ? 'Description : ' + text.trim().slice(0, 1500) : "Analyse l'image ci-dessus."}

Sois réaliste et généreux dans ton estimation calorique : les plats faits maison comme au restaurant sont très souvent sous-estimés car on oublie l'huile ou le beurre de cuisson, les sauces (crème fraîche, marinades, glaçages sucrés-salés), le fromage et les portions réelles. En cas de doute entre plusieurs estimations plausibles, choisis la plus haute.

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec ce format :
{
  "name": "Nom du repas",
  "emoji": "🍽️",
  "macros": {"kcal": 500, "prot": 30, "gluc": 50, "lip": 15},
  "ingredients": ["ingrédient avec quantité"],
  "advice": "Conseil nutritionnel court",
  "confidence": "haute|moyenne|basse"
}`,
      })
      const r = await askAI(content, 800)
      setResult(r); setName(r.name || 'Repas'); setPortion(1)
    } catch (e) {
      if (!e.handled) showToast("L'analyse a échoué, réessayez avec une description plus précise.", 'error')
    }
    setLoading(false)
  }

  const scaled = result ? {
    kcal: (result.macros?.kcal || 0) * portion, prot: (result.macros?.prot || 0) * portion,
    gluc: (result.macros?.gluc || 0) * portion, lip: (result.macros?.lip || 0) * portion,
  } : null

  const confirm = async () => {
    const meal = await addMeal({
      name: name.trim() || result.name, emoji: result.emoji || '🍽️',
      macros: { kcal: Math.round(scaled.kcal), prot: Math.round(scaled.prot), gluc: Math.round(scaled.gluc), lip: Math.round(scaled.lip) },
      mainIngredients: result.ingredients?.slice(0, 8), mealType, source: 'ai',
    }, day)
    if (meal) { showToast(`${meal.name} ajouté au journal`, 'success'); home() }
  }

  return (
    <div className="tone-coach">
      <ScreenHeader title="Analyse de repas" subtitle="Photo ou description, l'IA estime les valeurs" onBack={back} />

      {loading ? <Thinking text="Analyse de votre repas en cours…" /> : !result ? (
        <div className="space-y-4">
          <PhotoPicker photo={photo} onPhoto={setPhoto} />
          <Field label="Description (facultative avec une photo)">
            <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ex : assiette de poulet grillé, 150 g de riz et salade verte" maxLength={1500} />
          </Field>
          <MealTypeChips value={mealType} onChange={setMealType} />
          <Button size="lg" variant="tone" full onClick={analyze} className="mt-2"><Sparkles className="size-5" />Analyser avec l'IA</Button>
          <CreditNote />
        </div>
      ) : (
        <div className="k-enter space-y-3">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{result.emoji}</span>
              <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} aria-label="Nom du repas" className="!border-transparent !bg-transparent !px-0 !text-xl !font-bold" />
            </div>
            <MacroPills macros={scaled} className="mt-4" />
            <div className="mt-4">
              <div className="k-label">Portion</div>
              <div className="-mx-1 flex flex-wrap gap-2 px-1">
                {PORTIONS.map(p => <Chip key={p} active={portion === p} onClick={() => setPortion(p)}>×{p}</Chip>)}
              </div>
            </div>
            {result.confidence && <p className="mt-3 text-xs text-muted-foreground">Confiance de l'estimation : {result.confidence}. Ajustez la portion si besoin.</p>}
          </Card>

          {result.ingredients?.length > 0 && (
            <Card className="p-4">
              <div className="k-label">Ingrédients repérés</div>
              <ul className="space-y-1 text-sm">{result.ingredients.map((i, k) => <li key={k} className="text-muted-foreground">• {i}</li>)}</ul>
            </Card>
          )}
          {result.advice && (
            <div className="flex gap-2.5 rounded-3xl bg-tone-soft p-4 text-sm text-foreground">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-tone" /><span>{result.advice}</span>
            </div>
          )}
          <MealTypeChips value={mealType} onChange={setMealType} />
          <Button size="lg" variant="primary" full onClick={confirm}><Check className="size-5" />Ajouter au journal</Button>
          <Button variant="ghost" full onClick={() => setResult(null)}><RotateCcw className="size-4" />Modifier ma demande</Button>
        </div>
      )}
    </div>
  )
}
