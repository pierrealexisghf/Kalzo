import { useEffect, type ReactNode } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '@/theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Anneau de progression animé (calories, eau…).
export function Ring({ size = 160, stroke = 14, progress, color, children }: {
  size?: number; stroke?: number; progress: number; color: string; children?: ReactNode
}) {
  const { colors } = useTheme()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = useSharedValue(0)
  useEffect(() => { p.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 700, easing: Easing.out(Easing.cubic) }) }, [progress, p])
  const animated = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }))
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.muted} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} animatedProps={animated} />
      </Svg>
      {children}
    </View>
  )
}
