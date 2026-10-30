import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './ui/Text'
import { useTheme } from '@/theme'
import * as haptics from '@/lib/haptics'

// Ligne de réglage : icône, titre, valeur à droite, chevron. Cible ≥ 44 pt.
export function Row({ icon, title, value, onPress, danger, last }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; value?: string; onPress: () => void; danger?: boolean; last?: boolean
}) {
  const { colors } = useTheme()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={value ? `${title}, ${value}` : title} onPress={() => { haptics.tap(); onPress() }}
      style={({ pressed }) => ({ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, opacity: pressed ? 0.6 : 1, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border })}>
      <Ionicons name={icon} size={22} color={danger ? colors.destructive : colors.primary} />
      <Text weight={600} style={{ flex: 1 }} color={danger ? 'destructive' : 'fg'}>{title}</Text>
      {value ? <Text size={14} color="muted">{value}</Text> : null}
      {!danger ? <Ionicons name="chevron-forward" size={18} color={colors.mutedFg} /> : null}
    </Pressable>
  )
}

export function Group({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  return <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>{children}</View>
}
