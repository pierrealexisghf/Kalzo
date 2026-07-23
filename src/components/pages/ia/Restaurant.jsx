'use client'

import { useState, useRef } from 'react'
import { useApp } from '@/lib/AppContext'

export default function Restaurant({ onNavigate }) {
  const { debitCredit, addMeal, showToast } = useApp()
  const [photo, setPhoto] = useState(null)
  const [photoB64, setPhotoB64] = useState(null)
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
    if (!photoB64) return showToast('⚠️ Prenez une photo de la carte')
    const ok = await debitCredit()
    if (!ok) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: photoB64 }
              },
              {
                type: 'text',
                text: `Analyse cette carte de restaurant et identifie les plats. Pour chaque plat visible, estime les valeurs nutritionnelles.

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec ce format:
{
  "dishes": [
    {
      "name": "Nom du plat",
      "description": "Description courte",
      "macros": {"kcal": 600, "prot": 30, "gluc": 60, "lip": 20},
      "healthScore": 7,
      "tip": "Conseil diététique court"
    }
  ],
  "bestChoice": "Nom du meilleur choix nutritionnel",
  "advice": "Conseil général sur ce menu"
}`
              }
            ]
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      setResult(JSON.parse(clean))
    } catch (e) {
      showToast('❌ Erreur lors de l\'analyse')
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
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>📸 Restaurant</div>
      </div>

      {!result ? (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>
              PHOTO DE LA CARTE / MENU
            </label>

            {photo ? (
              <div style={{ position: 'relative' }}>
                <img src={photo} alt="carte" style={{ width: '100%', borderRadius: 12, maxHeight: 300, objectFit: 'cover' }} />
                <button onClick={() => { setPhoto(null); setPhotoB64(null) }} style={{
                  position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)',
                  border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14,
                }}>✕</button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 12, padding: '32px 20px',
                  textAlign: 'center', cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Prendre une photo</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Ou importer depuis la galerie</div>
              </div>
            )}

            <input
              ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={e => handleFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>

          <button onClick={analyze} disabled={!photo || loading} style={{
            width: '100%', background: !photo || loading ? 'var(--dim)' : 'var(--green)', color: '#fff',
            border: 'none', borderRadius: 12, padding: 14,
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15,
            cursor: !photo || loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ Analyse en cours...' : '⚡ Analyser avec l\'IA'}
          </button>
        </>
      ) : (
        <div>
          {result.advice && (
            <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>💡 Conseil nutritionnel</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{result.advice}</div>
              {result.bestChoice && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-light)', marginTop: 8 }}>⭐ Meilleur choix : {result.bestChoice}</div>}
            </div>
          )}

          {result.dishes?.map((dish, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{dish.name}</div>
                  {dish.description && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{dish.description}</div>}
                </div>
                {dish.healthScore && (
                  <div style={{
                    background: dish.healthScore >= 7 ? 'rgba(22,163,74,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${dish.healthScore >= 7 ? 'rgba(22,163,74,0.2)' : 'rgba(245,158,11,0.2)'}`,
                    borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 700,
                    color: dish.healthScore >= 7 ? 'var(--green-light)' : '#fbbf24',
                  }}>{dish.healthScore}/10</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                {[['kcal', dish.macros?.kcal], ['prot', dish.macros?.prot + 'g'], ['gluc', dish.macros?.gluc + 'g'], ['lip', dish.macros?.lip + 'g']].map(([l, v]) => (
                  <div key={l} style={{ background: 'var(--card2)', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{v}</div>
                    <div style={{ fontSize: 9, color: 'var(--muted)' }}>{l}</div>
                  </div>
                ))}
              </div>

              {dish.tip && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 10 }}>💡 {dish.tip}</div>}

              <button onClick={() => {
                addMeal({ id: Date.now(), name: dish.name, emoji: '🍽️', macros: dish.macros, mealType: 'repas' })
                showToast('✅ ' + dish.name + ' ajouté !')
              }} style={{
                width: '100%', background: 'var(--green-dim)', border: '1px solid rgba(22,163,74,0.2)',
                color: 'var(--green-light)', borderRadius: 10, padding: 10,
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>+ Ajouter à mon journal</button>
            </div>
          ))}

          <button onClick={() => { setResult(null); setPhoto(null); setPhotoB64(null) }} style={{
            width: '100%', background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', borderRadius: 12, padding: 12,
            fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>🔄 Analyser une autre carte</button>
        </div>
      )}
    </div>
  )
}
