'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { todayKey } from './nutrition'

// Navigation interne de l'app : 4 onglets + une pile d'écrans (outils, réglages…).
// Chaque écran empilé ajoute une entrée dans l'historique du navigateur, pour que
// le bouton « retour » du téléphone (ou le geste de glissement) referme l'écran
// au lieu de quitter l'application.
const NavContext = createContext(null)

export function NavProvider({ children }) {
  const [tab, setTabState] = useState('home')
  const [stack, setStack] = useState([])
  const [day, setDay] = useState(todayKey())
  const [addSheet, setAddSheet] = useState(null) // null | { step }
  const depth = useRef(0)

  useEffect(() => {
    const onPop = () => {
      if (depth.current > 0) {
        depth.current -= 1
        setStack(s => s.slice(0, -1))
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((name, props = {}) => {
    setAddSheet(null)
    depth.current += 1
    window.history.pushState({ k: depth.current }, '')
    setStack(s => [...s, { name, props, key: `${name}-${Date.now()}` }])
  }, [])

  const back = useCallback(() => {
    if (depth.current > 0) window.history.back()
  }, [])

  // Ferme tout et revient à l'onglet courant (après un enregistrement par exemple).
  const home = useCallback(() => {
    const n = depth.current
    if (n > 0) {
      depth.current = 0
      setStack([])
      window.history.go(-n)
    }
  }, [])

  const setTab = useCallback((t) => {
    setTabState(t)
    if (t !== 'journal') setDay(todayKey())
  }, [])

  const openAdd = useCallback((step = 'root') => setAddSheet({ step }), [])
  const closeAdd = useCallback(() => setAddSheet(null), [])

  const value = { tab, setTab, stack, go, back, home, day, setDay, addSheet, openAdd, closeAdd }
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export const useNav = () => {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
