import type { ReactNode } from 'react'
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme'

// Liquid Glass (iOS 26+). Le module est chargé avec prudence : sans verre disponible (ancien iOS, Android,
// « Réduire la transparence »…), on retombe sur le style plein `fallbackStyle`.
type GlassModule = { GlassView: React.ComponentType<{ style?: StyleProp<ViewStyle>; glassEffectStyle?: 'regular' | 'clear'; tintColor?: string; isInteractive?: boolean; colorScheme?: 'auto' | 'light' | 'dark'; children?: ReactNode }> }
let mod: GlassModule | null = null
try {
  if (Platform.OS === 'ios') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const g = require('expo-glass-effect')
    if (g.isLiquidGlassAvailable() && g.isGlassEffectAPIAvailable?.() !== false) mod = g
  }
} catch { mod = null }

export const glassAvailable = mod !== null

export function Glass({ children, style, fallbackStyle, tint, interactive, clear }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; fallbackStyle?: StyleProp<ViewStyle>
  tint?: string; interactive?: boolean; clear?: boolean
}) {
  const { isDark } = useTheme()
  if (!mod) return <View style={[style, fallbackStyle]}>{children}</View>
  const GlassView = mod.GlassView
  return (
    <GlassView style={style} glassEffectStyle={clear ? 'clear' : 'regular'} tintColor={tint} isInteractive={interactive}
      colorScheme={isDark ? 'dark' : 'light'}>
      {children}
    </GlassView>
  )
}
