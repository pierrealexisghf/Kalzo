'use client'

import { useState } from 'react'
import { Sparkles, ShoppingCart, ListChecks, CalendarDays, Timer, Copy, RotateCcw } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { askAI } from '@/lib/ai'
import { Button, Card, Field, Input, ScreenHeader, Segmented } from '@/components/ui/primitives'
import { CreditNote, Thinking } from './ToolKit'

export default function Batch() {
  const { checkCredits, showToast, profile } = useApp()
  const { back } = useNav()
  const [persons, setPersons] = useState('2')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const generate = async () => {
    if (!checkCredits()) return
    setLoading(true); setResult(null)
    try {
      const goal = profile?.goal || 'maintenance', kcal = profile?.kcal || 2000
      setResult(await askAI(`Tu es un expert en batch cooking et nutrition. Crée un plan de batch cooking hebdomadaire pour ${persons} personne(s).

Objectif nutritionnel : ${goal} (~${kcal} kcal/jour)
${prefs.trim() ? 'Préférences : ' + prefs.trim().slice(0, 300) : ''}

Le batch cooking doit permettre de préparer les repas de toute la semaine en une seule session de cuisine.

Réponds UNIQUEMENT en JSON valide (pas de markdown) :
{"totalTime":120,"shoppingList":["500 g de poulet"],"steps":[{"order":1,"title":"Cuire le riz","duration":15,"details":"…"}],"meals":[{"day":"Lundi","midi":"Nom du plat","soir":"Nom du plat"}],"tips":["Conseil"]}`, 2200))
    } catch (e) { if (!e.handled) showToast('La génération a échoué, réessayez.', 'error') }
    setLoading(false)
  }

  const copyList = async () => {
    try { await navigator.clipboard.writeText(result.shoppingList.map(i => `• ${i}`).join('\n')); showToast('Liste de courses copiée', 'success') }
    catch { showToast('Copie impossible sur cet appareil.', 'error') }
  }

  const Title = ({ icon: Icon, children, right }) => (
    <div className="mb-3 flex items-center justify-between">
      <span className="flex items-center gap-2 text-[15px] font-bold"><Icon className="size-[18px] text-tone" />{children}</span>{right}
    </div>
  )

  return (
    <div className="tone-coach">
      <ScreenHeader title="Batch Cooking" subtitle="Cuisinez une fois, mangez toute la semaine" onBack={back} />
      {loading ? <Thinking text="Organisation de votre session de cuisine…" /> : !result ? (
        <div className="space-y-4">
          <Field label="Nombre de personnes">
            <Segmented value={persons} onChange={setPersons} options={['1', '2', '3', '4'].map(n => ({ id: n, label: n }))} />
          </Field>
          <Field label="Envies ou contraintes (facultatif)"><Input value={prefs} onChange={e => setPrefs(e.target.value)} maxLength={300} placeholder="Riche en protéines, sans gluten, végétarien…" /></Field>
          <Button size="lg" variant="tone" full onClick={generate}><Sparkles className="size-5" />Générer mon plan</Button>
          <CreditNote />
        </div>
      ) : (
        <div className="k-enter space-y-3">
          <Card className="flex items-center gap-4 bg-tone-soft p-5">
            <Timer className="size-9 text-tone" />
            <div><div className="text-3xl font-extrabold">{result.totalTime} min</div><div className="text-sm text-muted-foreground">de préparation au total</div></div>
          </Card>
          <Card className="p-5">
            <Title icon={ShoppingCart} right={<button onClick={copyList} className="k-press flex items-center gap-1 text-[13px] font-bold text-primary"><Copy className="size-4" />Copier</button>}>Liste de courses</Title>
            <ul className="space-y-1.5 text-sm">{result.shoppingList?.map((i, k) => <li key={k} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-tone" />{i}</li>)}</ul>
          </Card>
          <Card className="p-5">
            <Title icon={ListChecks}>Étapes</Title>
            <ol className="space-y-3.5">{result.steps?.map((s, k) => (
              <li key={k} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-tone-soft text-xs font-bold text-tone">{s.order || k + 1}</span>
                <div><div className="text-sm font-semibold">{s.title} <span className="font-normal text-muted-foreground">· {s.duration} min</span></div>{s.details && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{s.details}</p>}</div>
              </li>))}</ol>
          </Card>
          {result.meals?.length > 0 && (
            <Card className="p-5">
              <Title icon={CalendarDays}>Planning</Title>
              <ul className="divide-y divide-border">{result.meals.map((m, k) => (
                <li key={k} className="py-2.5"><div className="text-[13px] font-bold text-tone">{m.day}</div><div className="text-[13px] text-muted-foreground">Midi : {m.midi} · Soir : {m.soir}</div></li>))}</ul>
            </Card>
          )}
          {result.tips?.length > 0 && <div className="space-y-1 rounded-3xl bg-tone-soft p-4 text-sm">{result.tips.map((t, k) => <p key={k}>💡 {t}</p>)}</div>}
          <Button variant="ghost" full onClick={() => setResult(null)}><RotateCcw className="size-4" />Nouveau plan</Button>
        </div>
      )}
    </div>
  )
}
