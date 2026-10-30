import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Appearance, useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { dark, light, type Palette } from './tokens'

export * from './tokens'

export type Appearance_ = 'system' | 'light' | 'dark'
type Theme = { colors: Palette; isDark: boolean; pref: Appearance_; setPref: (p: Appearance_) => void }
const ThemeContext = createContext<Theme>({ colors: light, isDark: false, pref: 'system', setPref: () => {} })
const KEY = 'kalzo.appearance'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const [pref, setPrefState] = useState<Appearance_>('system')
  // Préférence « Apparence » (Automatique / Clair / Sombre), conservée sur l'appareil.
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      if (v === 'light' || v === 'dark') { setPrefState(v); Appearance.setColorScheme(v) }
    }).catch(() => {})
  }, [])
  const setPref = useCallback((p: Appearance_) => {
    setPrefState(p)
    Appearance.setColorScheme(p === 'system' ? 'unspecified' : p)
    AsyncStorage.setItem(KEY, p).catch(() => {})
  }, [])
  const value = useMemo<Theme>(() => ({ colors: scheme === 'dark' ? dark : light, isDark: scheme === 'dark', pref, setPref }), [scheme, pref, setPref])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
