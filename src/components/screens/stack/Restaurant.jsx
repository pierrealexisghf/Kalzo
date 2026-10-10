'use client'

import { useState } from 'react'
import { Sparkles, Star, Lightbulb, RotateCcw, Plus } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { askAI } from '@/lib/ai'
import { todayKey } from '@/lib/nutrition'
import { Button, Card, ScreenHeader, MacroPills } from '@/components/ui/primitives'
import { PhotoPicker, CreditNote, Thinking, defaultMealType } from './ToolKit'

export default function Restaurant() {
  const { checkCredits, addMeal, showToast } = useApp()
  const { back, day } = useNav()
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [added, setAdded] = useState({})

  const analyze = async () => {
    if (!photo) return showToast('Prenez la carte en photo.', 'error')
    if (!checkCredits()) return
    setLoading(true); setResult(null); setAdded({})
    try {
      setResult(await askAI([
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photo.base64 } },
        { type: 'text', text: `Analyse cette carte de restaurant et identifie les plats. Pour chaque plat lisible (8 maximum), estime les valeurs nutritionnelles.

Sois réaliste et généreux dans ton estimation calorique : les plats de restaurant sont systématiquement sous-estimés (huile ou beurre de cuisson, sauces, portions généreuses). En cas de doute, choisis l'estimation la plus haute.

Réponds UNIQUEMENT en JSON valide (pas de markdown) :
{"dishes":[{"name":"Nom du plat","description":"Description courte","macros":{"kcal":600,"prot":30,"gluc":60,"lip":20},"healthScore":7,"tip":"Conseil diététique court"}],"bestChoice":"Nom du meilleur choix nutritionnel","advice":"Conseil général sur ce menu"}` },
      ], 1800))
    } catch (e) { if (!e.handled) showToast("L'analyse a échoué, essayez avec une photo plus nette.", 'error') }
    setLoading(false)
  }

  const add = async (dish, i) => {
    const meal = await addMeal({ name: dish.name, emoji: '🍽️', macros: dish.macros, mealType: day === todayKey() ? defaultMealType() : 'dejeuner', source: 'restaurant' }, day)
    if (meal) { setAdded(a => ({ ...a, [i]: true })); showToast(`${dish.name} ajouté`, 'success') }
  }

  return (
    <div className="tone-coach">
      <ScreenHeader title="Restaurant" subtitle="Photographiez la carte, choisissez malin" onBack={back} />
      {loading ? <Thinking text="Lecture de la carte en cours…" /> : !result ? (
        <div className="space-y-4">
          <PhotoPicker photo={photo} onPhoto={setPhoto} label="Photographier la carte ou le menu" height="h-56" />
          <Button size="lg" variant="tone" full disabled={!photo} onClick={analyze}><Sparkles className="size-5" />Analyser la carte</Button>
          <CreditNote />
        </div>
      ) : (
        <div className="k-enter space-y-3">
          {(result.advice || result.bestChoice) && (
            <div className="space-y-2 rounded-3xl bg-tone-soft p-4 text-sm">
              {result.bestChoice && <div className="flex items-center gap-2 font-bold text-tone"><Star className="size-4" />Meilleur choix : {result.bestChoice}</div>}
              {result.advice && <div className="flex gap-2"><Lightbulb className="mt-0.5 size-4 shrink-0 text-tone" /><span>{result.advice}</span></div>}
            </div>
          )}
          {result.dishes?.map((d, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold">{d.name}</div>
                  {d.description && <div className="mt-0.5 text-[13px] text-muted-foreground">{d.description}</div>}
                </div>
                {d.healthScore != null && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${d.healthScore >= 7 ? 'bg-nutri-soft text-nutri' : 'bg-sport-soft text-sport'}`}>{d.healthScore}/10</span>}
              </div>
              <MacroPills macros={d.macros} className="mt-3" />
              {d.tip && <p className="mt-3 text-[13px] text-muted-foreground">💡 {d.tip}</p>}
              <Button variant={added[i] ? 'outline' : 'soft'} full className="mt-3" disabled={added[i]} onClick={() => add(d, i)}>
                {added[i] ? 'Ajouté ✓' : <><Plus className="size-4" />Ajouter au journal</>}
              </Button>
            </Card>
          ))}
          <Button variant="ghost" full onClick={() => { setResult(null); setPhoto(null) }}><RotateCcw className="size-4" />Analyser une autre carte</Button>
        </div>
      )}
    </div>
  )
}
