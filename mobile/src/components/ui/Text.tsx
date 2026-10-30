import { Text as RNText, type TextProps, type TextStyle } from 'react-native'
import { useTheme, type Palette } from '@/theme'

const FONT = {
  400: 'Geist_400Regular', 500: 'Geist_500Medium', 600: 'Geist_600SemiBold', 700: 'Geist_700Bold', 800: 'Geist_800ExtraBold',
} as const

export type TextColor = 'fg' | 'muted' | 'primary' | 'destructive' | 'white' | keyof Palette

type Props = TextProps & {
  size?: number; weight?: keyof typeof FONT; color?: TextColor; center?: boolean; tabular?: boolean
}

// Texte de l'app : police Geist, taille dynamique (allowFontScaling, plafonnée à 1,4×).
export function Text({ size = 15, weight = 400, color = 'fg', center, tabular, style, ...rest }: Props) {
  const { colors } = useTheme()
  const resolved =
    color === 'fg' ? colors.foreground : color === 'muted' ? colors.mutedFg : color === 'primary' ? colors.primary
    : color === 'white' ? '#fff' : colors[color]
  const base: TextStyle = {
    fontFamily: FONT[weight], fontSize: size, color: resolved, lineHeight: Math.round(size * 1.32),
    textAlign: center ? 'center' : undefined,
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
  }
  return <RNText maxFontSizeMultiplier={1.4} style={[base, style]} {...rest} />
}
