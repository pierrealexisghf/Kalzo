import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Tabs, useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from './ui/Text'
import { useTheme } from '@/theme'
import * as haptics from '@/lib/haptics'

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

export const TAB_BAR_HEIGHT = 68
const ITEMS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  feed: { label: 'Feed', icon: 'people-outline', active: 'people' },
  journal: { label: 'Journal', icon: 'book-outline', active: 'book' },
  coach: { label: 'Coach IA', icon: 'sparkles-outline', active: 'sparkles' },
  profile: { label: 'Profil', icon: 'person-circle-outline', active: 'person-circle' },
}

// Barre du bas en capsule flottante : Feed | Journal | ➕ | Coach IA | Profil.
// Le ➕ n'est pas une page : il ouvre la feuille d'ajout.
export function FloatingTabBar({ state, emitter, navigateToTab }: BarProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12), alignItems: 'center' }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', height: TAB_BAR_HEIGHT, marginHorizontal: 16, paddingHorizontal: 8, borderRadius: 34,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
      }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index
          if (route.name === 'add') {
            return (
              <Pressable key={route.key} accessibilityRole="button" accessibilityLabel="Ajouter" accessibilityHint="Ouvre le menu pour ajouter un repas, une activité, de l’eau ou ton poids"
                onPress={() => { haptics.tap(); router.push('/add') }}
                style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 30, marginHorizontal: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
                <Ionicons name="add" size={34} color={colors.primaryFg} />
              </Pressable>
            )
          }
          const item = ITEMS[route.name]
          if (!item) return null
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: focused }}
              onPress={() => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
                if (!focused && !e.defaultPrevented) { haptics.select(); navigateToTab(route.key) }
              }}
              style={{ width: 66, height: 56, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Ionicons name={focused ? item.active : item.icon} size={24} color={focused ? colors.primary : colors.mutedFg} />
              <Text size={10.5} weight={focused ? 700 : 500} style={{ color: focused ? colors.primary : colors.mutedFg }} numberOfLines={1}>{item.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
