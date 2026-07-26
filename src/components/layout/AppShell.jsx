'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'

import Dashboard from '@/components/pages/Dashboard'
import Repas from '@/components/pages/Repas'
import IA from '@/components/pages/IA'
import Sante from '@/components/pages/Sante'
import Profil from '@/components/pages/Profil'
import Objectifs from '@/components/pages/Objectifs'
import Abonnement from '@/components/pages/Abonnement'
import Recettes from '@/components/pages/Recettes'
import Plan7Jours from '@/components/pages/ia/Plan7Jours'
import FrigoVide from '@/components/pages/ia/FrigoVide'
import Restaurant from '@/components/pages/ia/Restaurant'
import BatchCooking from '@/components/pages/ia/BatchCooking'
import SaisieIA from '@/components/pages/ia/SaisieIA'

const PAGES = {
  dashboard: Dashboard,
  repas: Repas,
  ia: IA,
  sante: Sante,
  profil: Profil,
  objectifs: Objectifs,
  abonnement: Abonnement,
  recettes: Recettes,
  plan: Plan7Jours,
  frigo: FrigoVide,
  restaurant: Restaurant,
  batch: BatchCooking,
  saisie: SaisieIA,
}

const NAV_ITEMS = [
  {
    id: 'dashboard', label: 'Accueil', icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    )
  },
  {
    id: 'repas', label: 'Repas', icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 4-6" />
      </svg>
    )
  },
  {
    id: 'ia', label: 'IA', icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 3l1.9 4.9L19 9.8l-4.9 1.9L12 16.6l-1.9-4.9L5 9.8l4.9-1.9L12 3z" />
      </svg>
    )
  },
  {
    id: 'sante', label: 'Santé', icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6a4.6 4.6 0 018.8-1.9 4.6 4.6 0 018.8 1.9z" />
      </svg>
    )
  },
  {
    id: 'profil', label: 'Profil', icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    )
  },
]

function AuthScreen() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAuth = async () => {
    setError('')
    setSuccess('')
    if (!email || !password) {
      setError('Veuillez renseigner votre email et mot de passe.')
      return
    }
    setLoading(true)
    if (tab === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(err.message)
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) setError(err.message)
      else setSuccess('Compte créé ! Vérifiez vos emails si une confirmation est requise.')
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    setError('')
    setSuccess('')
    if (!email) {
      setError('Renseignez votre email ci-dessus puis cliquez à nouveau.')
      return
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email)
    if (err) setError(err.message)
    else setSuccess('Email de réinitialisation envoyé.')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="font-display" style={{ fontSize: 28, fontWeight: 800 }}>Kalzo</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Votre coach nutrition IA</div>
        </div>

        <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {['login', 'signup'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }} style={{
              flex: 1, padding: 8, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t ? 'var(--green)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--muted)',
            }}>
              {t === 'login' ? 'Connexion' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          {error && (
            <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--rose)', marginBottom: 16 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--green-light)', marginBottom: 16 }}>
              {success}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>MOT DE PASSE</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleAuth()} />
          </div>

          <button onClick={handleAuth} disabled={loading} style={{
            width: '100%', background: 'var(--green)', border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 700, fontSize: 14, padding: 12, cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '...' : tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>

          {tab === 'signup' && (
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5, marginTop: 12 }}>
              En créant un compte vous recevez <strong style={{ color: 'var(--green-light)' }}>20 crédits IA offerts</strong> 🎁<br />
              pour tester Frigo Vide, Restaurant, Batch Cooking et bien plus !
            </p>
          )}

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <button onClick={handleForgotPassword} style={{
              background: 'none', border: 'none', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Mot de passe oublié ?
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--dim)' }}>
          🔒 Données sécurisées · Aucune carte requise pour s'inscrire
        </div>
      </div>
    </div>
  )
}

export default function AppShell() {
  const { user, loading } = useApp()
  const [page, setPage] = useState('dashboard')

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-light)' }}>Kalzo</div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  const Page = PAGES[page] || Dashboard

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', paddingBottom: 'calc(var(--bottom-nav-h) + 20px)' }}>
        <Page onNavigate={setPage} />
      </div>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 'var(--bottom-nav-h)',
        display: 'flex', background: 'var(--card)', borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, background: 'none', border: 'none', cursor: 'pointer',
              color: active ? 'var(--green-light)' : 'var(--muted)',
            }}>
              {item.icon}
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <Toast />
    </div>
  )
}
