import { Text, View } from 'react-native'
import { useTheme } from '@/theme'

export default function Index() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: '800' }}>Kalzo</Text>
    </View>
  )
}
