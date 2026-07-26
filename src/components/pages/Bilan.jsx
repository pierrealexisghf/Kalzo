'use client'

import { useApp } from '@/lib/AppContext'
import { getWeekData } from '@/lib/nutrition'

export default function Bilan({ onNavigate }) {
  const { profile, dailyMeals, dailySport } = useApp()
  const wData = getWeekData(dailyMeals, dailySport)

  const weeklyBaseKcal = profile ? profile.kcal * 7 : 14000
  const targets = profile
    ? { kcal: weeklyBaseKcal + wData.burned, prot: profile.prot * 7, gluc: profile.gluc * 7, lip: profile.lip * 7 }
    : { kcal: 14000, prot: 1050, gluc: 1540, lip: 385 }
  const netKcal = wData.macros.kcal - wData.burned
  const pct = (val, max) => Math.min(100, max > 0 ? Math.round((val / max) * 100) : 0)

  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today); monday.setDate(today.getDate() + mondayOffset)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  const macroCards = [
    { label: 'Calories mangées', val: wData.macros.kcal, max: targets.kcal, unit: ' kcal', color: 'var(--green-light)' },
    { label: 'Protéines', val: wData.macros.prot, max: targets.prot, unit: 'g', color: '#2dd4bf' },
    { label: 'Glucides', val: wData.macros.gluc, max: targets.gluc, unit: 'g', color: 'var(--amber)' },
    { label: 'Lipides', val: wData.macros.lip, max: targets.lip, unit: 'g', color: 'var(--rose)' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <button onClick={() => onNavigate('dashboard')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
        }}>← Retour</button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>📊 Bilan de la semaine</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        Semaine du {fmt(monday)} au {fmt(sunday)} · Se réinitialise chaque lundi
      </div>

      {wData.mealCount === 0 && wData.sportCount === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Aucune donnée cette semaine</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Commencez à enregistrer vos repas</div>
          <button onClick={() => onNavigate('repas')} style={{
            background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 12,
            padding: '11px 24px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>→ Aller au suivi du jour</button>
        </div>
      ) : (
        <>
          {/* Macros hebdo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {macroCards.map(m => (
              <div key={m.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.val}{m.unit}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{m.label}</div>
                <div style={{ height: 6, background: 'var(--card2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${pct(m.val, m.max)}%`, height: '100%', background: m.color, borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{pct(m.val, m.max)}% · objectif {m.max}{m.unit}</div>
              </div>
            ))}
          </div>

          {/* Sport + bilan net */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🔥 Activité sportive</div>
              <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--rose)' }}>{wData.burned} kcal</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>brûlées en {wData.sportCount} session{wData.sportCount > 1 ? 's' : ''}</div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>⚡ Bilan net</div>
              <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: netKcal > targets.kcal ? 'var(--rose)' : 'var(--green-light)' }}>{netKcal} kcal</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>mangées − sport · objectif {targets.kcal} kcal</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: netKcal <= targets.kcal ? 'var(--green-light)' : 'var(--rose)' }}>
                {netKcal <= targets.kcal ? '✅ Dans les objectifs !' : `⚠️ ${netKcal - targets.kcal} kcal au-dessus`}
              </div>
            </div>
          </div>

          {/* Analyse */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>📊 Analyse de la semaine</div>
            {[
              [pct(wData.macros.prot, targets.prot) >= 80 ? '✅' : '⚠️', `Protéines : ${pct(wData.macros.prot, targets.prot)}% de l'objectif hebdo atteint`],
              [wData.sportCount >= 3 ? '✅' : wData.sportCount >= 1 ? '⚠️' : '❌', `Sport : ${wData.sportCount} session${wData.sportCount > 1 ? 's' : ''} ${wData.sportCount >= 3 ? '— Excellente semaine !' : wData.sportCount >= 1 ? '— Continuez !' : '— Aucune activité enregistrée'}`],
              [wData.mealCount >= 10 ? '✅' : '⚠️', `Suivi : ${wData.mealCount} repas enregistrés cette semaine`],
            ].map(([icon, text], i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--muted)', marginBottom: 8, alignItems: 'flex-start' }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>

          {/* Repas de la semaine */}
          {wData.meals.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                🍽️ Repas de la semaine <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({wData.mealCount})</span>
              </div>
              {[...wData.meals].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 20).map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{m.emoji} {m.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{m.macros?.kcal || 0} kcal</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
