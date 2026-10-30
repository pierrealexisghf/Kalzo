import { View } from 'react-native'
import { Text } from './ui/Text'
import { useTheme } from '@/theme'
import { initialOf } from '@/lib/social'

export function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const { colors } = useTheme()
  return (
    <View accessibilityElementsHidden style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.nutriSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text size={size * 0.45} weight={800} color="nutri">{initialOf(name)}</Text>
    </View>
  )
}
