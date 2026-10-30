import { View } from 'react-native'
import { Text } from './Text'
import { useTheme } from '@/theme'

// Petit histogramme sur 7 jours (eau, sport, calories…).
export function Bars({ values, labels, color, goal, height = 110, highlight }: {
  values: number[]; labels: string[]; color: string; goal?: number; height?: number; highlight?: number
}) {
  const { colors } = useTheme()
  const max = Math.max(goal ?? 0, ...values, 1)
  return (
    <View accessible accessibilityLabel={labels.map((l, i) => `${l} : ${Math.round(values[i])}`).join(', ')} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: height + 22 }}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <View style={{ height, width: '100%', justifyContent: 'flex-end', borderRadius: 8, backgroundColor: colors.muted, overflow: 'hidden' }}>
            <View style={{ height: Math.max(v > 0 ? 4 : 0, (v / max) * height), backgroundColor: color, opacity: highlight == null || highlight === i ? 1 : 0.55, borderRadius: 8 }} />
          </View>
          <Text size={11} weight={highlight === i ? 800 : 500} color={highlight === i ? 'fg' : 'muted'}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  )
}
