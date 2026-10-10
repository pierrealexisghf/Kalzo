'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { NavProvider, useNav } from '@/lib/nav'
import { LogoMark } from '@/components/ui/Logo'
import Toast from '@/components/ui/Toast'
import AuthScreen from '@/components/layout/AuthScreen'
import UpdatePassword from '@/components/layout/UpdatePassword'
import Onboarding from '@/components/layout/Onboarding'
import BottomNav from '@/components/layout/BottomNav'
import AddSheet from '@/components/layout/AddSheet'
import Home from '@/components/screens/Home'
import Journal from '@/components/screens/Journal'
import Coach from '@/components/screens/Coach'
import Me from '@/components/screens/Me'
import { STACK_SCREENS } from '@/components/screens/registry'

const TABS = { home: Home, journal: Journal, coach: Coach, me: Me }

function Splash() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="k-pop"><LogoMark size={84} className="animate-pulse rounded-[22px] shadow-float" /></div>
    </div>
  )
}

// Retour de Stripe : le webhook peut prendre quelques secondes, on relit le profil.
function usePaymentReturn() {
  const { reload, showToast, user } = useApp()
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    const status = params.get('payment')
    if (!status) return
    window.history.replaceState({}, '', window.location.pathname)
    if (status === 'cancelled') return showToast('Paiement annulé, aucun débit effectué.')
    showToast('Paiement reçu, activation de votre abonnement…', 'success')
    let tries = 0
    const timer = setInterval(() => { reload(); if (++tries >= 4) clearInterval(timer) }, 2500)
    return () => clearInterval(timer)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps
}

function Main() {
  const { tab, stack } = useNav()
  usePaymentReturn()
  const Tab = TABS[tab]
  const top = stack[stack.length - 1]
  const Stacked = top ? STACK_SCREENS[top.name] : null

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div
        id="scroller"
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 18px)',
          paddingBottom: Stacked ? 'calc(env(safe-area-inset-bottom) + 32px)' : 'calc(110px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto max-w-lg px-4">
          {Stacked
            ? <div key={top.key} className="k-enter"><Stacked {...top.props} /></div>
            : <div key={tab} className="k-enter"><Tab /></div>}
        </div>
      </div>
      {!Stacked && <BottomNav />}
      <AddSheet />
    </div>
  )
}

function Gate() {
  const { user, loading, dataReady, recovery, profile } = useApp()
  if (loading) return <Splash />
  if (!user) return <AuthScreen />
  if (recovery) return <UpdatePassword />
  if (!dataReady) return <Splash />
  if (!profile) return <Onboarding />
  return <NavProvider><Main /></NavProvider>
}

export default function AppShell() {
  return (
    <>
      <Gate />
      <Toast />
    </>
  )
}
