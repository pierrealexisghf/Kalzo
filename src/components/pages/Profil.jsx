'use client'

import { useApp } from '@/lib/AppContext'

export default function Profil({ onNavigate }) {
  const { user, userPlan, credits, subStatus, logout } = useApp()

  const planLabel = userPlan === 'vip' ? '💎 VIP' : userPlan === 'standard' ? '⚡ Standard' : '🆓 Gratuit'
  const planColor = userPlan === 'vip' ? '#4ade80' : userPlan === 'standard' ? '#fbbf24' : '#f87171'

  const menuItems = [
    { icon: '🎯', label: 'Profil & Objectifs', sub: 'Poids, taille, objectif calorique', page: 'objectifs' },
    { icon: '💎', label: 'Abonnement', sub: userPlan === 'vip' ? 'Plan VIP · Crédits illimités' : userPlan === 'standard' ? `Plan Standard · ${credits} crédits` : 'Aucun abonnement', page: 'abonnement' },
    { icon: '🍲', label: 'Recettes (230)', sub: 'Base de données complète', page: 'recettes' },
    { icon: '📅', label: 'Plan 7 Jours', sub: 'Mon menu de la semaine', page: 'plan' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800 }}>Mon Profil</div>
      </div>

      {/* Avatar + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--green-dim)', border: '2px solid rgba(22,163,74,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>👤</div>
        <div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {user?.email}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: `${planColor}18`, border: `1px solid ${planColor}30`,
            borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: planColor,
          }}>
            {planLabel}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
        MON COMPTE
      </div>

      {menuItems.map(item => (
        <button key={item.page} onClick={() => onNavigate(item.page)} style={{
          width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.icon}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.sub}</div>
            </div>
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 18 }}>›</span>
        </button>
      ))}

      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

      <button onClick={logout} style={{
        width: '100%', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
        color: '#f87171', borderRadius: 12, padding: 13,
        fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        marginBottom: 20,
      }}>
        Déconnexion
      </button>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--dim)' }}>
        Kalzo v2.0 · contactkalzo.fr@gmail.com
      </div>
    </div>
  )
}
