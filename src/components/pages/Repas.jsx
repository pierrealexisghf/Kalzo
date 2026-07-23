'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { todayKey } from '@/lib/nutrition'
import { RECIPES, BREAKFAST_RECIPES } from '@/data/recipes'

const TABS = [
  { id: 'suivi', label: 'Suivi du jour' },
  { id: 'ajouter', label: 'Ajouter' },
  { id: 'recettes', label: 'Recettes' },
  { id: 'historique', label: 'Historique' },
]

export default function Repas({ onNavigate }) {
  const [tab, setTab] = useState('suivi')
  const { dailyMeals, removeMeal, addMeal, showToast } = useApp()
  const today = todayKey()
  const todayMeals = dailyMeals[today] || []

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Mes Repas</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Suivez votre alimentation</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: '1px solid var(--border)',
            background: tab === t.id ? 'var(--green)' : 'var(--card)',
            color: tab === t.id ? '#fff' : 'var(--muted)',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'suivi' && <SuiviTab meals={todayMeals} onRemove={removeMeal} onNavigate={onNavigate} />}
      {tab === 'ajouter' && <AjouterTab onNavigate={onNavigate} />}
      {tab === 'recettes' && <RecettesTab onAdd={addMeal} onShow={(id) => {}} showToast={showToast} />}
      {tab === 'historique' && <HistoriqueTab dailyMeals={dailyMeals} />}
    </div>
  )
}

function SuiviTab({ meals, onRemove, onNavigate }) {
  const today = todayKey()
  if (!meals.length) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Aucun repas aujourd'hui</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Commencez à tracker votre alimentation</div>
      <button onClick={() => onNavigate('saisie')} style={{
        background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 12,
        padding: '11px 24px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
      }}>⚡ Analyser un repas avec l'IA</button>
    </div>
  )

  const totals = meals.reduce((acc, m) => ({
    kcal: acc.kcal + (m.macros?.kcal || 0),
    prot: acc.prot + (m.macros?.prot || 0),
    gluc: acc.gluc + (m.macros?.gluc || 0),
    lip: acc.lip + (m.macros?.lip || 0),
  }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })

  return (
    <div>
      {/* Totaux */}
      <div style={{
        background: 'var(--card)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 16,
        padding: 16, marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.05em', marginBottom: 8 }}>TOTAL DU JOUR</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-light)' }}>{totals.kcal}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>kcal</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#f87171' }}>{totals.prot}g</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Prot</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>{totals.gluc}g</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Gluc</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa' }}>{totals.lip}g</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Lip</div>
          </div>
        </div>
      </div>

      {/* Liste */}
      {meals.map(m => (
        <div key={m.id} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '12px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.emoji} {m.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {m.macros?.kcal||0} kcal · P:{m.macros?.prot||0}g G:{m.macros?.gluc||0}g L:{m.macros?.lip||0}g
            </div>
          </div>
          <button onClick={() => onRemove(m.id, today)} style={{
            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
            color: '#f87171', borderRadius: 8, padding: '5px 8px', fontSize: 12, cursor: 'pointer',
          }}>✕</button>
        </div>
      ))}
    </div>
  )
}

function AjouterTab({ onNavigate }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { icon: '✍️', name: 'Saisie IA', desc: 'Décrivez ou photographiez un repas', page: 'saisie', ia: true },
          { icon: '🧊', name: 'Frigo Vide', desc: 'Recette avec vos ingrédients', page: 'frigo', ia: true },
          { icon: '📸', name: 'Restaurant', desc: 'Photo de carte', page: 'restaurant', ia: true },
          { icon: '🍲', name: 'Recettes', desc: '230 recettes disponibles', page: null, ia: false },
        ].map(item => (
          <button key={item.name} onClick={() => item.page ? onNavigate(item.page) : null} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
            padding: 14, textAlign: 'left', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>{item.desc}</div>
            {item.ia && (
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: 99, padding: '2px 6px', fontSize: 9, fontWeight: 700,
                color: 'var(--green-light)', marginTop: 6,
              }}>⚡ IA</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function RecettesTab({ onAdd, showToast }) {
  const [search, setSearch] = useState('')
  const all = [...RECIPES, ...BREAKFAST_RECIPES]
  const filtered = search
    ? all.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.mainIngredients?.some(i => i.includes(search.toLowerCase())))
    : all.slice(0, 30)

  const handleAdd = (r) => {
    onAdd({
      id: Date.now(),
      name: r.name,
      emoji: r.emoji || '🍽️',
      macros: r.macros,
      mealType: 'repas',
    })
    showToast('✅ ' + r.name + ' ajouté !')
  }

  return (
    <div>
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher une recette..."
        style={{ marginBottom: 12 }}
      />
      {filtered.map(r => (
        <div key={r.id} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 28 }}>{r.emoji || '🍽️'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏱️ {r.time} min · {r.macros?.kcal||0} kcal</div>
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

function HistoriqueTab({ dailyMeals }) {
  const days = Object.keys(dailyMeals).sort().reverse().slice(0, 14)

  if (!days.length) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 13 }}>
      Aucun historique disponible
    </div>
  )

  return (
    <div>
      {days.map(day => {
        const meals = dailyMeals[day] || []
        const total = meals.reduce((s, m) => s + (m.macros?.kcal || 0), 0)
        const date = new Date(day)
        const label = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        return (
          <div key={day} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--muted)',
              letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{label}</span>
              <span style={{ color: 'var(--green-light)' }}>{total} kcal</span>
            </div>
            {meals.map(m => (
              <div key={m.id} style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '8px 12px', marginBottom: 6, fontSize: 13,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{m.emoji} {m.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>{m.macros?.kcal||0} kcal</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
