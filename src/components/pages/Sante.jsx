'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { todayKey, getTodayWater, getTodayBurnedKcal } from '@/lib/nutrition'

const TABS = [
  { id: 'eau', label: '💧 Eau' },
  { id: 'sport', label: '🏃 Sport' },
  { id: 'poids', label: '⚖️ Poids' },
]

export default function Sante() {
  const [tab, setTab] = useState('eau')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Santé & Sport</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Hydratation et activité physique</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: '1px solid var(--border)',
            background: tab === t.id ? 'var(--green)' : 'var(--card)',
            color: tab === t.id ? '#fff' : 'var(--muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'eau' && <EauTab />}
      {tab === 'sport' && <SportTab />}
      {tab === 'poids' && <PoidsTab />}
    </div>
  )
}

function EauTab() {
  const { dailyWater, waterGoal, addWater, resetWater, setWaterGoal, showToast, user } = useApp()
  const water = getTodayWater(dailyWater)
  const pct = Math.min((water / waterGoal) * 100, 100)
  const [custom, setCustom] = useState('')
  const [newGoal, setNewGoal] = useState('')

  const quickAmounts = [150, 250, 330, 500]

  return (
    <div>
      {/* Jauge principale */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
        padding: 24, marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 8 }}>AUJOURD'HUI</div>
        <div className="font-display" style={{ fontSize: 48, fontWeight: 900, color: '#3b82f6', marginBottom: 4 }}>
          {water >= 1000 ? `${(water / 1000).toFixed(1)}L` : `${water}ml`}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          objectif : {waterGoal >= 1000 ? `${(waterGoal / 1000).toFixed(1)}L` : `${waterGoal}ml`}
        </div>
        <div style={{ height: 8, background: 'var(--card2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: 99, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Boutons rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {quickAmounts.map(ml => (
          <button key={ml} onClick={() => { addWater(ml); showToast(`💧 +${ml}ml ajouté`) }} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 12, textAlign: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: 'var(--text)',
          }}>+{ml}ml</button>
        ))}
      </div>

      {/* Saisie manuelle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="number" value={custom} onChange={e => setCustom(e.target.value)} placeholder="Quantité (ml)" style={{ flex: 1 }} />
        <button onClick={() => {
          const ml = parseInt(custom)
          if (ml > 0) { addWater(ml); showToast(`💧 +${ml}ml ajouté`); setCustom('') }
        }} style={{
          background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10,
          padding: '11px 16px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>+</button>
      </div>

      {/* Objectif */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>MODIFIER L'OBJECTIF</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="Ex: 2500" style={{ flex: 1 }} />
          <button onClick={() => {
            const g = parseInt(newGoal)
            if (g > 0) { setWaterGoal(g); showToast('✅ Objectif mis à jour'); setNewGoal('') }
          }} style={{
            background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--green-light)',
            borderRadius: 10, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Sauver</button>
        </div>
      </div>

      <button onClick={() => { resetWater(); showToast('💧 Compteur remis à zéro') }} style={{
        background: 'transparent', border: '1px solid rgba(244,63,94,0.2)', color: '#f87171',
        borderRadius: 10, padding: '10px', width: '100%', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>Remettre à zéro</button>
    </div>
  )
}

function SportTab() {
  const { dailySport, addSport, removeSport, showToast, debitCredit } = useApp()
  const today = todayKey()
  const todaySports = dailySport[today] || []
  const totalKcal = todaySports.reduce((s, a) => s + (a.kcal || 0), 0)
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [duration, setDuration] = useState('')

  const quickSports = [
    { name: 'Course à pied', emoji: '🏃', kcalPerMin: 10 },
    { name: 'Vélo', emoji: '🚴', kcalPerMin: 7 },
    { name: 'Natation', emoji: '🏊', kcalPerMin: 8 },
    { name: 'Musculation', emoji: '💪', kcalPerMin: 6 },
    { name: 'Football', emoji: '⚽', kcalPerMin: 9 },
    { name: 'Marche', emoji: '🚶', kcalPerMin: 4 },
  ]

  const handleAdd = async () => {
    if (!name || !kcal) return showToast('⚠️ Remplissez au moins le nom et les calories')
    const ok = await debitCredit()
    if (!ok) return
    await addSport({ name, kcal: parseInt(kcal), duration: parseInt(duration) || 0, emoji: '🏃' })
    showToast('✅ Activité ajoutée')
    setName(''); setKcal(''); setDuration('')
  }

  return (
    <div>
      {/* Total */}
      {totalKcal > 0 && (
        <div style={{
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 14, padding: 14, marginBottom: 16, textAlign: 'center',
        }}>
          <div className="font-display" style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>{totalKcal} kcal</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>brûlées aujourd'hui</div>
        </div>
      )}

      {/* Activités du jour */}
      {todaySports.map(s => (
        <div key={s.id} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '10px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.emoji} {s.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.kcal} kcal · {s.duration} min</div>
          </div>
          <button onClick={() => removeSport(s.id, today)} style={{
            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
            color: '#f87171', borderRadius: 8, padding: '5px 8px', fontSize: 12, cursor: 'pointer',
          }}>✕</button>
        </div>
      ))}

      {/* Raccourcis */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 10, marginTop: 16 }}>
        RACCOURCIS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {quickSports.map(s => (
          <button key={s.name} onClick={async () => {
            const dur = 30
            const ok = await debitCredit()
            if (!ok) return
            await addSport({ name: s.name, kcal: s.kcalPerMin * dur, duration: dur, emoji: s.emoji })
            showToast(`✅ ${s.name} (30min) ajouté`)
          }} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 10, textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 22 }}>{s.emoji}</div>
            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, color: 'var(--text)' }}>{s.name}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)' }}>{s.kcalPerMin * 30} kcal/30min</div>
          </button>
        ))}
      </div>

      {/* Saisie manuelle */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>SAISIE MANUELLE</div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ACTIVITÉ</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Football" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>KCAL</label>
            <input type="number" value={kcal} onChange={e => setKcal(e.target.value)} placeholder="Ex: 400" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>DURÉE (min)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ex: 60" />
          </div>
        </div>
        <button onClick={handleAdd} style={{
          width: '100%', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 12,
          padding: 11, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>+ Ajouter l'activité</button>
      </div>
    </div>
  )
}

function PoidsTab() {
  const { weightGoal, weightEntries, setWeightGoal, setWeightEntries, showToast, user } = useApp()
  const { supabase } = require('@/lib/supabase')
  const [newWeight, setNewWeight] = useState('')
  const [goalInput, setGoalInput] = useState('')

  const saveGoal = async () => {
    const g = parseFloat(goalInput)
    if (!g) return
    setWeightGoal(g)
    await supabase.from('profiles').update({ weight_goal: g }).eq('id', user.id)
    showToast('✅ Objectif sauvegardé')
    setGoalInput('')
  }

  const addWeight = async () => {
    const w = parseFloat(newWeight)
    if (!w) return
    const entry = { date: new Date().toISOString(), weight: w }
    const newEntries = [...(weightEntries || []), entry]
    setWeightEntries(newEntries)
    await supabase.from('profiles').update({ weight_entries: newEntries }).eq('id', user.id)
    showToast('✅ Pesée ajoutée')
    setNewWeight('')
  }

  return (
    <div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>OBJECTIF DE POIDS (kg)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder={weightGoal ? `Actuel: ${weightGoal}kg` : 'Ex: 75'} style={{ flex: 1 }} />
          <button onClick={saveGoal} style={{
            background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--green-light)',
            borderRadius: 10, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Sauver</button>
        </div>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>AJOUTER UNE PESÉE</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="Ex: 78.5" step="0.1" style={{ flex: 1 }} />
          <button onClick={addWeight} style={{
            background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10,
            padding: '11px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>+</button>
        </div>
      </div>
      {weightEntries?.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>HISTORIQUE</div>
          {[...weightEntries].reverse().slice(0, 10).map((e, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 13 }}>{new Date(e.date).toLocaleDateString('fr-FR')}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{e.weight} kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
