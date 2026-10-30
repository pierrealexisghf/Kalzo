import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { dark, light, type Palette } from './tokens'

export * from './tokens'

type Theme = { colors: Palette; isDark: boolean }
const ThemeContext = createContext<Theme>({ colors: light, isDark: false })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const value = useMemo<Theme>(() => ({ colors: scheme === 'dark' ? dark : light, isDark: scheme === 'dark' }), [scheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
