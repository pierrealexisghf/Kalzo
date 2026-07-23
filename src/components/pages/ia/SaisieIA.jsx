'use client'

import { useState, useRef } from 'react'
import { useApp } from '@/lib/AppContext'

export default function SaisieIA({ onNavigate }) {
  const { debitCredit, addMeal, showToast } = useApp()
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoB64, setPhotoB64] = useState(null)
  const [mealType, setMealType] = useState('dejeuner')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhoto(e.target.result)
      setPhotoB64(e.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const analyze = async () => {
    if (!text && !photoB64) return showToast('⚠️ Décrivez ou photographiez votre repas')
    const ok = await debitCredit()
    if (!ok) return

    setLoading(true)
    setResult(null)

    try {
      const content = []
      if (photoB64) {
        content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photoB64 } })
      }
      content.push({
        type: 'text',
        text: `Analyse ce repas et estime ses valeurs nutritionnelles précises.
${text ? 'Description: ' + text : 'Analyse l\'image ci-dessus.'}

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec ce format:
{
  "name": "Nom du repas",
  "emoji": "🍽️",
  "macros": {"kcal": 500, "prot": 30, "gluc": 50, "lip": 15},
  "ingredients": ["ing 1 avec quantité", "ing 2 avec quantité"],
  "advice": "Conseil nutritionnel court",
  "confidence": "haute/moyenne/basse"
}`
      })

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_tokens: 800, messages: [{ role: 'user', content }] })
      })
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      setResult(JSON.parse(clean))
    } catch (e) {
      showToast('❌ Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const confirmMeal = () => {
    if (!result) return
    addMeal({ id: Date.now(), name: result.name, emoji: result.emoji || '🍽️', macros: result.macros, mealType })
    showToast('✅ ' + result.name + ' ajouté !')
    setResult(null); setText(''); setPhoto(null); setPhotoB64(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => onNavigate('ia')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
        }}>← Retour</button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>✍️ Saisie IA</div>
      </div>

      {!result ? (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>DÉCRIVEZ VOTRE REPAS</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
              placeholder="Ex: une assiette de poulet grillé avec 150g de riz et une salade verte" style={{ resize: 'none' }} />
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>OU PRENEZ UNE PHOTO</label>
            {photo ? (
              <div style={{ position: 'relative' }}>
                <img src={photo} alt="repas" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
                <button onClick={() => { setPhoto(null); setPhotoB64(null) }} style={{
                  position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)',
                  border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12,
                }}>✕</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{
                width: '100%', background: 'var(--card2)', border: '2px dashed var(--border)',
                borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 24 }}>📸</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Prendre une photo</div>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>TYPE DE REPAS</label>
            <select value={mealType} onChange={e => setMealType(e.target.value)}>
              <option value="petit-dejeuner">Petit-déjeuner</option>
              <option value="dejeuner">Déjeuner</option>
              <option value="diner">Dîner</option>
              <option value="collation">Collation</option>
            </select>
          </div>

          <button onClick={analyze} disabled={loading} style={{
            width: '100%', background: loading ? 'var(--dim)' : 'var(--green)', color: '#fff',
            border: 'none', borderRadius: 12, padding: 14,
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ Analyse en cours...' : '⚡ Analyser avec l\'IA'}
          </button>
        </>
      ) : (
        <div>
          <div style={{ background: 'var(--card)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 20, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{result.emoji}</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{result.name}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[['kcal', result.macros?.kcal, 'var(--green-light)'], ['prot', result.macros?.prot + 'g', '#f87171'], ['gluc', result.macros?.gluc + 'g', '#fbbf24'], ['lip', result.macros?.lip + 'g', '#60a5fa']].map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--card2)', borderRadius: 10, padding: 8, textAlign: 'center' }}>
                  <div className="font-display" style={{ fontSize: 14, fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>{l}</div>
                </div>
              ))}
            </div>

            {result.ingredients?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>INGRÉDIENTS DÉTECTÉS</div>
                {result.ingredients.map((ing, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>• {ing}</div>
                ))}
              </div>
            )}

            {result.advice && (
              <div style={{ background: 'var(--green-dim)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>💡 {result.advice}</div>
              </div>
            )}

            <button onClick={confirmMeal} style={{
              width: '100%', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 12,
              padding: 12, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 8,
            }}>✅ Confirmer et ajouter au journal</button>

            <button onClick={() => setResult(null)} style={{
              width: '100%', background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--muted)', borderRadius: 12, padding: 10,
              fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>← Modifier</button>
          </div>
        </div>
      )}
    </div>
  )
}
