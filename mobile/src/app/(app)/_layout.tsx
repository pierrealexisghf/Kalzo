import { Stack } from 'expo-router'
import { useTheme } from '@/theme'

export default function AppLayout() {
  const { colors } = useTheme()
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add" options={{
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.62], sheetCornerRadius: 28,
        contentStyle: { backgroundColor: colors.card },
      }} />
    </Stack>
  )
}
