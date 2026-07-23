'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { calculateProfile } from '@/lib/nutrition'

const GOALS = [
  { id: 'seche', label: 'Sèche', icon: '🔥', desc: '-400 kcal' },
  { id: 'maintenance', label: 'Maintenance', icon: '⚖️', desc: '±0 kcal' },
  { id: 'masse', label: 'Masse', icon: '💪', desc: '+300 kcal' },
]

const ACTIVITIES = [
  { value: '1.2', label: 'Sédentaire', desc: 'Peu ou pas d\'exercice' },
  { value: '1.375', label: 'Légèrement actif', desc: '1-3 fois/semaine' },
  { value: '1.55', label: 'Modérément actif', desc: '3-5 fois/semaine' },
  { value: '1.725', label: 'Très actif', desc: '6-7 fois/semaine' },
  { value: '1.9', label: 'Extrêmement actif', desc: 'Athlète' },
]

export default function Objectifs({ onNavigate }) {
  const { profile, saveProfile, showToast } = useApp()
  const [form, setForm] = useState({
    weight: profile?.weight || '',
    height: profile?.height || '',
    age: profile?.age || '',
    gender: profile?.gender || 'male',
    activity: profile?.activity?.toString() || '1.55',
    goal: profile?.goal || 'maintenance',
  })
  const [result, setResult] = useState(null)

  const handleSave = async () => {
    if (!form.weight || !form.height || !form.age) return showToast('⚠️ Remplissez tous les champs')
    const p = calculateProfile(form)
    await saveProfile(p)
    setResult(p)
    showToast('✅ Profil sauvegardé !')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => onNavigate('profil')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
        }}>← Retour</button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>Profil & Objectifs</div>
      </div>

      {/* Infos de base */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>INFORMATIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>POIDS (kg)</label>
            <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="75" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>TAILLE (cm)</label>
            <input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="175" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>ÂGE</label>
            <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="25" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>SEXE</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </div>
        </div>
      </div>

      {/* Niveau d'activité */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>NIVEAU D'ACTIVITÉ</div>
        {ACTIVITIES.map(a => (
          <button key={a.value} onClick={() => setForm(f => ({ ...f, activity: a.value }))} style={{
            width: '100%', background: form.activity === a.value ? 'var(--green-dim)' : 'var(--card2)',
            border: `1px solid ${form.activity === a.value ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`,
            borderRadius: 10, padding: '10px 12px', marginBottom: 6,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: form.activity === a.value ? 'var(--green-light)' : 'var(--text)' }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.desc}</div>
            </div>
            {form.activity === a.value && <span style={{ color: 'var(--green-light)' }}>✓</span>}
          </button>
        ))}
      </div>

      {/* Objectif */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>OBJECTIF</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {GOALS.map(g => (
            <button key={g.id} onClick={() => setForm(f => ({ ...f, goal: g.id }))} style={{
              background: form.goal === g.id ? 'var(--green-dim)' : 'var(--card2)',
              border: `1px solid ${form.goal === g.id ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`,
              borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer',
            }}>
              <div style={{ fontSize: 22 }}>{g.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: form.goal === g.id ? 'var(--green-light)' : 'var(--text)' }}>{g.label}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{g.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave} style={{
        width: '100%', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 12,
        padding: 13, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        marginBottom: 16,
      }}>
        💾 Sauvegarder le profil
      </button>

      {/* Résultats */}
      {result && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--green)', borderRadius: 16, padding: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div className="font-display" style={{ fontSize: 42, fontWeight: 900, color: 'var(--green-light)' }}>{result.kcal}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>kcal / jour</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[['Protéines', result.prot + 'g', '#f87171'], ['Glucides', result.gluc + 'g', '#fbbf24'], ['Lipides', result.lip + 'g', '#60a5fa']].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div className="font-display" style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
