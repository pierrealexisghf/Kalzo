'use client'

import { useApp } from '@/lib/AppContext'

export default function Abonnement({ onNavigate }) {
  const { userPlan, subStatus, credits, trialEndsAt, periodEnd, subscribe, cancelSubscription } = useApp()

  const hasActive = ['active', 'trialing', 'cancelling'].includes(subStatus)
  const endDate = (periodEnd || trialEndsAt) ? new Date(periodEnd || trialEndsAt).toLocaleDateString('fr-FR') : null

  let statusText = ''
  if (subStatus === 'trialing') statusText = `Période d'essai · se termine le ${endDate}`
  else if (subStatus === 'active') statusText = `Actif · prochain renouvellement le ${endDate}`
  else if (subStatus === 'cancelling') statusText = `Résilié · accès maintenu jusqu'au ${endDate}`
  else statusText = 'Aucun abonnement actif'

  const planName = userPlan === 'vip' ? '💎 Plan VIP' : userPlan === 'standard' ? '⚡ Plan Standard' : '🆓 Gratuit'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => onNavigate('profil')} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
        }}>← Retour</button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>Abonnement</div>
      </div>

      {/* Plan actuel */}
      <div style={{
        background: hasActive ? 'var(--green-dim)' : 'var(--card)',
        border: `1px solid ${hasActive ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`,
        borderRadius: 20, padding: 20, marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.05em', marginBottom: 6 }}>VOTRE PLAN</div>
        <div className="font-display" style={{ fontSize: 26, fontWeight: 800, color: 'var(--green-light)', marginBottom: 4 }}>{planName}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{statusText}</div>

        {userPlan === 'vip' && (
          <div style={{ fontSize: 13, color: 'var(--green-light)', fontWeight: 600 }}>✨ Crédits illimités</div>
        )}
        {userPlan === 'standard' && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Crédits restants : <strong style={{ color: 'var(--green-light)' }}>{credits}</strong> / 120
          </div>
        )}

        {hasActive && subStatus !== 'cancelling' && (
          <button onClick={cancelSubscription} style={{
            marginTop: 14, background: 'transparent', border: '1px solid rgba(244,63,94,0.3)',
            color: '#f87171', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Résilier l'abonnement
          </button>
        )}
      </div>

      {/* Plans disponibles */}
      {!hasActive && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Choisir un abonnement</div>

          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
            padding: 20, marginBottom: 12, cursor: 'pointer',
          }} onClick={() => subscribe('standard')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div className="font-display" style={{ fontSize: 18, fontWeight: 800 }}>⚡ Standard</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>120 crédits IA / mois</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="font-display" style={{ fontSize: 30, fontWeight: 900, color: 'var(--green-light)' }}>7€</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>/mois</div>
              </div>
            </div>
            <button style={{
              width: '100%', background: 'transparent', border: '1px solid rgba(74,222,128,0.3)',
              color: 'var(--green-light)', borderRadius: 12, padding: 12,
              fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>Essai gratuit 7 jours →</button>
          </div>

          <div style={{
            background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 16,
            padding: 20, marginBottom: 12, cursor: 'pointer',
          }} onClick={() => subscribe('vip')}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>⭐ MEILLEUR PLAN</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div className="font-display" style={{ fontSize: 18, fontWeight: 800 }}>💎 VIP</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Crédits illimités</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="font-display" style={{ fontSize: 30, fontWeight: 900, color: 'var(--green-light)' }}>10€</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>/mois</div>
              </div>
            </div>
            <button style={{
              width: '100%', background: 'var(--green)', border: 'none',
              color: '#fff', borderRadius: 12, padding: 12,
              fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>Essai gratuit 7 jours →</button>
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            🎁 7 jours gratuits · Aucun débit avant la fin · Résiliez à tout moment
          </div>
        </>
      )}

      {/* Ce que consomme 1 crédit */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>CE QUE CONSOMME 1 CRÉDIT</div>
        {[
          ['🧊 Frigo Vide', 'Créer une recette IA'],
          ['📸 Restaurant', 'Analyser une carte'],
          ['🍳 Batch Cooking', 'Générer une session'],
          ['✍️ Saisie IA', 'Analyser un repas'],
          ['🏃 Sport', 'Calcul dépense calorique'],
        ].map(([icon, label]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13 }}>{icon} {label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-light)' }}>1 crédit</span>
          </div>
        ))}
        {userPlan === 'vip' && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--green-light)', fontWeight: 600 }}>
            ✨ Plan VIP = illimité, aucune restriction
          </div>
        )}
      </div>
    </div>
  )
}
