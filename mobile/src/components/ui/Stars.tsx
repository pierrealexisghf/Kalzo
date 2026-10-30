import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg'
import { View } from 'react-native'
import { useTheme } from '@/theme'

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z'

// Étoiles avec demi-étoiles (pour les moyennes). `value` entre 0 et 5.
export function Stars({ value, size = 16, gap = 2 }: { value: number; size?: number; gap?: number }) {
  const { colors } = useTheme()
  const v = Math.max(0, Math.min(5, value))
  const label = `${v.toFixed(1).replace('.', ',')} étoiles sur 5`
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ flexDirection: 'row', gap }}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.max(0, Math.min(1, v - i))
        const id = `s${i}-${Math.round(fill * 10)}`
        return (
          <Svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <Defs><ClipPath id={id}><Rect x="0" y="0" width={24 * fill} height="24" /></ClipPath></Defs>
            <Path d={STAR} fill={colors.border} />
            {fill > 0 && <Path d={STAR} fill={colors.star} clipPath={`url(#${id})`} />}
          </Svg>
        )
      })}
    </View>
  )
}
