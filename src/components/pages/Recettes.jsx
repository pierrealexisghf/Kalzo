'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { RECIPES, BREAKFAST_RECIPES } from '@/data/recipes'

export default function Recettes({ onNavigate }) {
  const { addMeal, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  let list = filter === 'breakfast' ? BREAKFAST_RECIPES : [...RECIPES, ...BREAKFAST_RECIPES]
  if (search) {
    const q = search.toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(q) || r.mainIngredients?.some(i => i.includes(q)))
  }

  const handleAdd = (r) => {
    addMeal({ id: Date.now(), name: r.name, emoji: r.emoji || '🍽️', macros: r.macros, mealType: 'repas' })
    showToast('✅ ' + r.name + ' ajouté !')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => onNavigate('profil')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
        }}>← Retour</button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>🍲 Recettes</div>
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{ marginBottom: 12 }} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['all', 'Toutes'], ['breakfast', 'Petits-déj']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: '1px solid var(--border)',
            background: filter === id ? 'var(--green)' : 'var(--card)',
            color: filter === id ? '#fff' : 'var(--muted)',
          }}>{label}</button>
        ))}
      </div>

      {list.slice(0, 50).map(r => (
        <div key={r.id} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 28 }}>{r.emoji || '🍽️'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏱️ {r.time} min</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {[r.macros?.kcal + ' kcal', 'P:' + r.macros?.prot + 'g', 'G:' + r.macros?.gluc + 'g', 'L:' + r.macros?.lip + 'g'].map(v => (
                <span key={v} style={{
                  background: 'var(--card2)', borderRadius: 99, padding: '2px 8px',
                  fontSize: 10, fontWeight: 600, color: 'var(--muted)',
                }}>{v}</span>
              ))}
            </div>
          </div>
          <button onClick={() => handleAdd(r)} style={{
            background: 'var(--green-dim)', border: '1px solid rgba(22,163,74,0.2)',
            color: 'var(--green-light)', borderRadius: 8, padding: '6px 10px',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>+ Ajouter</button>
        </div>
      ))}
    </div>
  )
}
