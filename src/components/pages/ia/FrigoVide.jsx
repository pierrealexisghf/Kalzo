'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'

export default function FrigoVide({ onNavigate }) {
  const { debitCredit, addMeal, showToast } = useApp()
  const [ingredients, setIngredients] = useState('')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const generate = async () => {
    if (!ingredients.trim()) return showToast('⚠️ Entrez vos ingrédients')
    const ok = await debitCredit()
    if (!ok) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 1200,
          messages: [{
            role: 'user',
            content: `Tu es un chef cuisinier expert en nutrition. Crée une recette originale et délicieuse avec ces ingrédients disponibles: ${ingredients}. ${prefs ? 'Préférences: ' + prefs : ''}

Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de backticks) avec ce format exact:
{
  "name": "Nom de la recette",
  "emoji": "🍳",
  "time": 20,
  "ingredients": ["200g de poulet", "100g de riz"],
  "steps": ["Étape 1...", "Étape 2..."],
  "macros": {"kcal": 450, "prot": 35, "gluc": 40, "lip": 12},
  "tip": "Astuce du chef..."
}`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const recipe = JSON.parse(clean)
      setResult(recipe)
    } catch (e) {
      showToast('❌ Erreur lors de la génération')
    } finally {
      setLoading(false)
    }
  }

  const addToLog = () => {
    if (!result) return
    addMeal({
      id: Date.now(),
      name: result.name,
      emoji: result.emoji || '🍳',
      macros: result.macros,
      mealType: 'repas',
    })
    showToast('✅ ' + result.name + ' ajouté au journal !')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => onNavigate('ia')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
        }}>← Retour</button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>🧊 Frigo Vide</div>
      </div>

      {!result ? (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>VOS INGRÉDIENTS</label>
            <textarea
              value={ingredients} onChange={e => setIngredients(e.target.value)}
              rows={4} placeholder="Ex: poulet, riz, tomates, oignons, ail, courgettes..."
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>PRÉFÉRENCES (optionnel)</label>
            <input value={prefs} onChange={e => setPrefs(e.target.value)} placeholder="Ex: sans gluten, rapide, végétarien..." />
          </div>

          <button onClick={generate} disabled={loading} style={{
            width: '100%', background: loading ? 'var(--dim)' : 'var(--green)', color: '#fff',
            border: 'none', borderRadius: 12, padding: 14,
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ Génération en cours...' : '⚡ Générer une recette IA'}
          </button>

          {loading && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--muted)', fontSize: 13 }}>
              L'IA crée votre recette sur mesure...
            </div>
          )}
        </>
      ) : (
        <div>
          {/* Header recette */}
          <div style={{ background: 'var(--card)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 20, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{result.emoji}</div>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{result.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>⏱️ {result.time} min</div>

            {/* Macros */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                ['kcal', result.macros?.kcal, 'var(--green-light)'],
                ['prot', result.macros?.prot + 'g', '#f87171'],
                ['gluc', result.macros?.gluc + 'g', '#fbbf24'],
                ['lip', result.macros?.lip + 'g', '#60a5fa'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: 'center', background: 'var(--card2)', borderRadius: 10, padding: 8 }}>
                  <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>{l}</div>
                </div>
              ))}
            </div>

            <button onClick={addToLog} style={{
              width: '100%', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 12,
              padding: 12, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>+ Ajouter à mon journal</button>
          </div>

          {/* Ingrédients */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>INGRÉDIENTS</div>
            {result.ingredients?.map((ing, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>{ing}</span>
              </div>
            ))}
          </div>

          {/* Étapes */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>PRÉPARATION</div>
            {result.steps?.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'var(--green-dim)',
                  color: 'var(--green-light)', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ fontSize: 13, lineHeight: 1.5, paddingTop: 3 }}>{step}</span>
              </div>
            ))}
          </div>

          {result.tip && (
            <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>💡 Astuce du chef</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{result.tip}</div>
            </div>
          )}

          <button onClick={() => setResult(null)} style={{
            width: '100%', background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', borderRadius: 12, padding: 12,
            fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>🔄 Générer une autre recette</button>
        </div>
      )}
    </div>
  )
}
