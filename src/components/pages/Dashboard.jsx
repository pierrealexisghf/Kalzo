'use client'

import { useApp } from '@/lib/AppContext'
import { todayKey, getTodayConsumedKcal, getTodayBurnedKcal, getTodayWater, getGreeting, formatDate } from '@/lib/nutrition'

export default function Dashboard({ onNavigate }) {
  const { profile, dailyMeals, dailySport, dailyWater, waterGoal } = useApp()
  const today = todayKey()

  const consumed = getTodayConsumedKcal(dailyMeals)
  const burned = getTodayBurnedKcal(dailySport)
  const goal = profile ? (profile.kcal + burned) : 0
  const remaining = goal > 0 ? Math.max(0, goal - consumed) : 0
  const water = getTodayWater(dailyWater)
  const todayMeals = dailyMeals[today] || []
  const todaySports = dailySport[today] || []
  const sportKcal = todaySports.reduce((s, a) => s + (a.kcal || 0), 0)

  // Macros
  const macros = todayMeals.reduce((acc, m) => ({
    prot: acc.prot + (m.macros?.prot || 0),
    gluc: acc.gluc + (m.macros?.gluc || 0),
    lip: acc.lip + (m.macros?.lip || 0),
  }), { prot: 0, gluc: 0, lip: 0 })

  // Ring
  const circumference = 289
  const consumedRatio = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const burnedRatio = goal > 0 ? Math.min(burned / goal, 1) : 0

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>{getGreeting()} 👋</div>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800 }}>{formatDate()}</div>
      </div>

      {/* Ring calorique */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
        padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <circle cx="55" cy="55" r="46" fill="none" stroke="#16a34a" strokeWidth="10"
              strokeLinecap="round" strokeDasharray={circumference}
              strokeDashoffset={circumference - consumedRatio * circumference}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            <circle cx="55" cy="55" r="46" fill="none" stroke="#3b82f6" strokeWidth="4"
              strokeLinecap="round" strokeDasharray={circumference}
              strokeDashoffset={circumference - burnedRatio * circumference}
              style={{ opacity: 0.5, transition: 'stroke-dashoffset 0.6s ease' }} />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-light)', lineHeight: 1 }}>{consumed}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>kcal</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {[
            ['🎯 Objectif', goal ? `${goal} kcal` : '— kcal', 'var(--text)'],
            ['🍽️ Consommé', `${consumed} kcal`, 'var(--green-light)'],
            ['🔥 Brûlé sport', `${burned} kcal`, '#3b82f6'],
            ['⚡ Restant', `${remaining} kcal`, 'var(--text)'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <button onClick={() => onNavigate('sante')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 14, textAlign: 'left', cursor: 'pointer',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>💧</div>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-light)' }}>
            {water >= 1000 ? `${(water / 1000).toFixed(1)} L` : `${water} ml`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Hydratation</div>
        </button>
        <button onClick={() => onNavigate('sante')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 14, textAlign: 'left', cursor: 'pointer',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🏃</div>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>
            {sportKcal} kcal
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sport aujourd'hui</div>
        </button>
      </div>

      {/* Macros */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
        padding: 16, marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
          Macros du jour
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            ['Protéines', macros.prot + 'g', '#f87171'],
            ['Glucides', macros.gluc + 'g', '#fbbf24'],
            ['Lipides', macros.lip + 'g', '#60a5fa'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Repas du jour */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
        Repas du jour
      </div>
      {todayMeals.length === 0 ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 16,
        }}>
          Aucun repas enregistré aujourd'hui
          <div style={{ marginTop: 10 }}>
            <button onClick={() => onNavigate('repas')} style={{
              background: 'var(--green-dim)', border: '1px solid rgba(22,163,74,0.2)',
              color: 'var(--green-light)', borderRadius: 8, padding: '7px 14px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              + Ajouter un repas
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {todayMeals.slice(-4).reverse().map(m => (
            <div key={m.id} style={{
              background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '10px 12px', marginBottom: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.emoji} {m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>P:{m.macros?.prot||0}g G:{m.macros?.gluc||0}g L:{m.macros?.lip||0}g</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-light)' }}>{m.macros?.kcal||0} kcal</div>
            </div>
          ))}
        </div>
      )}

      {/* Accès rapide IA */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
        Accès rapide
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '🧊', name: 'Frigo Vide', desc: 'Recette avec vos ingrédients', page: 'frigo' },
          { icon: '📸', name: 'Restaurant', desc: 'Analyser une carte', page: 'restaurant' },
          { icon: '🍳', name: 'Batch Cooking', desc: 'Préparer la semaine', page: 'batch' },
          { icon: '📅', name: 'Plan 7 Jours', desc: 'Générer un menu', page: 'plan' },
        ].map(item => (
          <button key={item.page} onClick={() => onNavigate(item.page)} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
            padding: 14, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>{item.desc}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 99, padding: '2px 6px', fontSize: 9, fontWeight: 700,
              color: 'var(--green-light)', letterSpacing: '0.05em', marginTop: 6,
            }}>
              ⚡ IA
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
