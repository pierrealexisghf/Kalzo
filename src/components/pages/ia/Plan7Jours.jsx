'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'

export default function Plan7Jours({ onNavigate }) {
  const { debitCredit, showToast, profile, currentPlan, savePlan } = useApp()
  const [goalInput, setGoalInput] = useState(profile?.goal || 'maintenance')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(currentPlan)

  const generate = async () => {
    const ok = await debitCredit()
    if (!ok) return

    setLoading(true)
    setPlan(null)

    try {
      const kcal = profile?.kcal || 2000
      const prot = profile?.prot || 150
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Tu es un diététicien expert. Crée un plan alimentaire complet sur 7 jours.

Objectif: ${goalInput} (~${kcal} kcal/jour, ${prot}g de protéines/jour)
${prefs ? 'Préférences: ' + prefs : ''}

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec ce format:
{
  "days": [
    {
      "day": "Lundi",
      "breakfast": {"name": "Nom", "kcal": 400, "prot": 20, "gluc": 50, "lip": 12, "ingredients": ["ing1", "ing2"]},
      "lunch": {"name": "Nom", "kcal": 600, "prot": 40, "gluc": 60, "lip": 18, "ingredients": ["ing1", "ing2"]},
      "dinner": {"name": "Nom", "kcal": 500, "prot": 35, "gluc": 45, "lip": 15, "ingredients": ["ing1", "ing2"]},
      "snack": {"name": "Nom", "kcal": 200, "prot": 10, "gluc": 25, "lip": 6},
      "totalKcal": 1700
    }
  ],
  "shoppingList": ["item1", "item2"],
  "tips": ["conseil1", "conseil2"]
}`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setPlan(parsed)
      await savePlan(parsed)
    } catch (e) {
      showToast('❌ Erreur lors de la génération')
    } finally {
      setLoading(false)
    }
  }

  const MEAL_LABELS = { breakfast: '🌅 Petit-déjeuner', lunch: '🍽️ Déjeuner', dinner: '🌙 Dîner', snack: '🍎 Collation' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => onNavigate('ia')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
        }}>← Retour</button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>📅 Plan 7 Jours</div>
      </div>

      {!plan ? (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>OBJECTIF</label>
            <select value={goalInput} onChange={e => setGoalInput(e.target.value)}>
              <option value="seche">Sèche / Perte de poids</option>
              <option value="maintenance">Maintenance</option>
              <option value="masse">Prise de masse</option>
            </select>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>PRÉFÉRENCES (optionnel)</label>
            <input value={prefs} onChange={e => setPrefs(e.target.value)} placeholder="Ex: sans gluten, végétarien, méditerranéen..." />
          </div>

          <button onClick={generate} disabled={loading} style={{
            width: '100%', background: loading ? 'var(--dim)' : 'var(--green)', color: '#fff',
            border: 'none', borderRadius: 12, padding: 14,
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ Génération en cours...' : '⚡ Générer mon plan 7 jours'}
          </button>
        </>
      ) : (
        <div>
          {plan.days?.map((day, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="font-display" style={{ fontSize: 16, fontWeight: 800 }}>{day.day}</div>
                <div style={{ fontSize: 12, color: 'var(--green-light)', fontWeight: 700 }}>{day.totalKcal} kcal</div>
              </div>
              {['breakfast', 'lunch', 'dinner', 'snack'].map(meal => day[meal] && (
                <div key={meal} style={{ background: 'var(--card2)', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 3 }}>{MEAL_LABELS[meal]}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{day[meal].name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {day[meal].kcal} kcal · P:{day[meal].prot}g G:{day[meal].gluc}g L:{day[meal].lip}g
                  </div>
                </div>
              ))}
            </div>
          ))}

          {plan.tips?.length > 0 && (
            <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>💡 Conseils</div>
              {plan.tips.map((t, i) => <div key={i} style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>• {t}</div>)}
            </div>
          )}

          <button onClick={() => setPlan(null)} style={{
            width: '100%', background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', borderRadius: 12, padding: 12,
            fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>🔄 Générer un nouveau plan</button>
        </div>
      )}
    </div>
  )
}
