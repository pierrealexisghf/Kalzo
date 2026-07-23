'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'

export default function BatchCooking({ onNavigate }) {
  const { debitCredit, showToast, profile } = useApp()
  const [persons, setPersons] = useState('2')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const generate = async () => {
    const ok = await debitCredit()
    if (!ok) return

    setLoading(true)
    setResult(null)

    try {
      const goal = profile?.goal || 'maintenance'
      const kcal = profile?.kcal || 2000
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Tu es un expert en batch cooking et nutrition. Crée un plan de batch cooking hebdomadaire pour ${persons} personne(s).

Objectif nutritionnel: ${goal} (~${kcal} kcal/jour)
${prefs ? 'Préférences: ' + prefs : ''}

Le batch cooking doit permettre de préparer des repas pour toute la semaine en une seule session de cuisine.

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec ce format:
{
  "totalTime": 120,
  "shoppingList": ["500g de poulet", "300g de riz", "..."],
  "steps": [
    {"order": 1, "title": "Cuire le riz", "duration": 15, "details": "..."},
    {"order": 2, "title": "Préparer le poulet", "duration": 20, "details": "..."}
  ],
  "meals": [
    {"day": "Lundi", "midi": "Nom du plat", "soir": "Nom du plat"}
  ],
  "tips": ["Conseil 1", "Conseil 2"]
}`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      setResult(JSON.parse(clean))
    } catch (e) {
      showToast('❌ Erreur lors de la génération')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => onNavigate('ia')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
        }}>← Retour</button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>🍳 Batch Cooking</div>
      </div>

      {!result ? (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>NOMBRE DE PERSONNES</label>
            <select value={persons} onChange={e => setPersons(e.target.value)}>
              {['1','2','3','4'].map(n => <option key={n} value={n}>{n} personne{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>PRÉFÉRENCES (optionnel)</label>
            <input value={prefs} onChange={e => setPrefs(e.target.value)} placeholder="Ex: sans gluten, riche en protéines, végétarien..." />
          </div>

          <button onClick={generate} disabled={loading} style={{
            width: '100%', background: loading ? 'var(--dim)' : 'var(--green)', color: '#fff',
            border: 'none', borderRadius: 12, padding: 14,
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ Génération en cours...' : '⚡ Générer mon Batch Cooking'}
          </button>
        </>
      ) : (
        <div>
          {/* Infos */}
          <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 16, padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 32, fontWeight: 900, color: 'var(--green-light)' }}>{result.totalTime} min</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>de préparation totale</div>
          </div>

          {/* Liste de courses */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>🛒 LISTE DE COURSES</div>
            {result.shoppingList?.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Étapes */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>📋 ÉTAPES DE PRÉPARATION</div>
            {result.steps?.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'var(--green-dim)',
                  color: 'var(--green-light)', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{step.order}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{step.title} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {step.duration} min</span></div>
                  {step.details && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{step.details}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Planning */}
          {result.meals?.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>📅 PLANNING DE LA SEMAINE</div>
              {result.meals.map((m, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-light)', marginBottom: 2 }}>{m.day}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Midi: {m.midi} · Soir: {m.soir}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setResult(null)} style={{
            width: '100%', background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', borderRadius: 12, padding: 12,
            fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>🔄 Générer un nouveau plan</button>
        </div>
      )}
    </div>
  )
}
