'use client'

import { useState } from 'react'
import { Check, Sparkles, Flame } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { askAI } from '@/lib/ai'
import { Button, Card, Field, Input, Textarea, ScreenHeader, Segmented, Chip } from '@/components/ui/primitives'
import { CreditNote, Thinking } from './ToolKit'

// Dépense = MET × poids (kg) × durée (h) — méthode standard, gratuite.
const SPORTS = [
  { name: 'Course à pied', emoji: '🏃', met: 9.8 },
  { name: 'Marche', emoji: '🚶', met: 3.5 },
  { name: 'Vélo', emoji: '🚴', met: 7.5 },
  { name: 'Natation', emoji: '🏊', met: 8 },
  { name: 'Musculation', emoji: '💪', met: 5 },
  { name: 'Fitness / HIIT', emoji: '🔥', met: 8 },
  { name: 'Football', emoji: '⚽', met: 7 },
  { name: 'Basket', emoji: '🏀', met: 6.5 },
  { name: 'Tennis', emoji: '🎾', met: 7.3 },
  { name: 'Randonnée', emoji: '🥾', met: 6 },
  { name: 'Yoga', emoji: '🧘', met: 2.5 },
  { name: 'Danse', emoji: '💃', met: 5 },
]
const DURATIONS = [15, 30, 45, 60, 90]

export default function SportAdd() {
  const { profile, addSport, checkCredits, showToast } = useApp()
  const { back, home, day } = useNav()
  const [mode, setMode] = useState('quick')
  const weight = profile?.weight || 70

  // Rapide
  const [sport, setSport] = useState(null)
  const [minutes, setMinutes] = useState(30)
  const kcalFor = (met, min) => Math.round(met * weight * (min / 60))

  // Manuel
  const [manual, setManual] = useState({ name: '', minutes: '', kcal: '' })
  // IA
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [ai, setAi] = useState(null)

  const done = (s) => { if (s) { showToast(`${s.name} ajouté · ${Math.round(s.kcal)} kcal`, 'success'); home() } }

  const saveQuick = async () => done(await addSport({ name: sport.name, emoji: sport.emoji, kcal: kcalFor(sport.met, minutes), duration: minutes }, day))

  const saveManual = async () => {
    const min = parseInt(manual.minutes), kcal = parseInt(manual.kcal)
    if (!manual.name.trim()) return showToast("Donnez un nom à l'activité.", 'error')
    if (!(min > 0 && min <= 1440)) return showToast('Indiquez une durée valide (en minutes).', 'error')
    if (!(kcal >= 0 && kcal <= 10000)) return showToast('Indiquez des calories valides.', 'error')
    done(await addSport({ name: manual.name.trim(), emoji: '🏃', kcal, duration: min }, day))
  }

  const analyze = async () => {
    if (!text.trim()) return showToast('Décrivez votre activité.', 'error')
    if (!checkCredits()) return
    setLoading(true); setAi(null)
    try {
      setAi(await askAI(`Tu es un expert en physiologie du sport et dépense énergétique.
Profil : ${weight} kg.
Activité décrite : "${text.trim().slice(0, 600)}"

Calcule les calories brûlées. Réponds UNIQUEMENT en JSON valide (pas de markdown) :
{"name":"Nom de l'activité","emoji":"🏃","duration_minutes":30,"intensity":"légère|modérée|intense|très intense","kcal_burned":280,"tip":"Conseil de récupération ou de progression"}`, 500))
    } catch (e) { if (!e.handled) showToast("L'analyse a échoué, réessayez.", 'error') }
    setLoading(false)
  }

  const saveAi = async () => done(await addSport({
    name: ai.name, emoji: ai.emoji || '🏃', kcal: ai.kcal_burned, duration: ai.duration_minutes, intensity: ai.intensity,
  }, day))

  return (
    <div className="tone-sport">
      <ScreenHeader title="Ajouter une activité" subtitle={`Calcul basé sur votre poids (${weight} kg)`} onBack={back} />
      <Segmented value={mode} onChange={setMode} className="mb-5" options={[{ id: 'quick', label: 'Rapide' }, { id: 'ai', label: 'Décrire' }, { id: 'manual', label: 'Manuel' }]} />

      {mode === 'quick' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {SPORTS.map(s => (
              <button key={s.name} onClick={() => setSport(s)}
                className={`k-press k-card flex flex-col items-center gap-1.5 px-1 py-3.5 ${sport?.name === s.name ? '!border-tone bg-tone-soft ring-2 ring-tone/25' : ''}`}>
                <span className="text-[28px]">{s.emoji}</span>
                <span className="text-center text-[11.5px] font-semibold leading-tight">{s.name}</span>
              </button>
            ))}
          </div>
          {sport && (
            <Card className="k-enter p-5">
              <div className="k-label">Durée</div>
              <div className="-mx-1 flex flex-wrap gap-2 px-1">
                {DURATIONS.map(d => <Chip key={d} active={minutes === d} onClick={() => setMinutes(d)}>{d} min</Chip>)}
              </div>
              <Input type="number" inputMode="numeric" value={minutes} onChange={e => setMinutes(Math.min(600, Math.max(1, parseInt(e.target.value) || 1)))} className="mt-3" aria-label="Durée personnalisée en minutes" />
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-tone-soft px-4 py-3 text-tone">
                <Flame className="size-5" />
                <span className="text-lg font-extrabold">≈ {kcalFor(sport.met, minutes)} kcal</span>
              </div>
            </Card>
          )}
          <Button size="lg" variant="tone" full disabled={!sport} onClick={saveQuick}><Check className="size-5" />Ajouter</Button>
        </div>
      )}

      {mode === 'ai' && (loading ? <Thinking text="Calcul de la dépense énergétique…" /> : !ai ? (
        <div className="space-y-4">
          <Field label="Décrivez votre séance">
            <Textarea value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={600} placeholder="Ex : 1 h de foot en salle avec des amis, puis 10 minutes d'étirements" />
          </Field>
          <Button size="lg" variant="tone" full onClick={analyze}><Sparkles className="size-5" />Estimer avec l'IA</Button>
          <CreditNote />
        </div>
      ) : (
        <div className="k-enter space-y-3">
          <Card className="p-5 text-center">
            <div className="text-5xl">{ai.emoji}</div>
            <div className="mt-2 text-xl font-bold">{ai.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{ai.duration_minutes} min · intensité {ai.intensity}</div>
            <div className="mt-4 text-4xl font-extrabold text-tone">{Math.round(ai.kcal_burned)}<span className="ml-1 text-base font-semibold text-muted-foreground">kcal</span></div>
            {ai.tip && <p className="mt-4 rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{ai.tip}</p>}
          </Card>
          <Button size="lg" variant="tone" full onClick={saveAi}><Check className="size-5" />Ajouter au journal</Button>
          <Button variant="ghost" full onClick={() => setAi(null)}>Modifier ma description</Button>
        </div>
      ))}

      {mode === 'manual' && (
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <Field label="Activité"><Input value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} placeholder="Ex : Escalade" maxLength={120} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Durée (min)"><Input type="number" inputMode="numeric" value={manual.minutes} onChange={e => setManual(m => ({ ...m, minutes: e.target.value }))} placeholder="45" /></Field>
              <Field label="Calories brûlées"><Input type="number" inputMode="numeric" value={manual.kcal} onChange={e => setManual(m => ({ ...m, kcal: e.target.value }))} placeholder="300" /></Field>
            </div>
          </Card>
          <Button size="lg" variant="tone" full onClick={saveManual}><Check className="size-5" />Ajouter</Button>
        </div>
      )}
    </div>
  )
}
