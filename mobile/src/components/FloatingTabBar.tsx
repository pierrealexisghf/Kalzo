/* eslint-disable react-hooks/refs -- la lentille expose une ref de mesure et des gestes : lus dans des callbacks. */
import { useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Tabs, useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from './ui/Text'
import { Glass } from './ui/Glass'
import { useTheme } from '@/theme'
import * as haptics from '@/lib/haptics'
import { LentilleVerre, useLentille, type Zone } from './ui/LentilleBarre'

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
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const onglets = state.routes.filter(r => !!ITEMS[r.name])
  const actif = onglets.findIndex(r => state.routes[state.index]?.key === r.key)
  const [zones, setZones] = useState<Zone[]>([])

  const aller = (route: (typeof onglets)[number], focused: boolean) => {
    const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
    if (!focused && !e.defaultPrevented) navigateToTab(route.key)
  }
  // Un tap OU un glissement qui se termine sur un onglet : même chemin (la lentille suit le doigt, voir LentilleBarre).
  const lentille = useLentille({
    zones, actif,
    onChoisir: i => { const r = onglets[i]; if (r) aller(r, actif === i) },
    onSurvol: haptics.select,
  })
  const mesurer = (i: number) => (e: { nativeEvent: { layout: { x: number; width: number } } }) => {
    const { x, width } = e.nativeEvent.layout
    setZones(prev => {
      if (prev[i] && prev[i].x === x && prev[i].w === width) return prev
      const suivant = [...prev]
      suivant[i] = { x, w: width }
      return suivant
    })
  }
  const prets = zones.length === onglets.length && zones.every(Boolean)

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12), alignItems: 'center' }}>
      <Glass clear
        style={{ flexDirection: 'row', alignItems: 'center', height: TAB_BAR_HEIGHT, marginHorizontal: 16, paddingHorizontal: 8, borderRadius: 34 }}
        fallbackStyle={{
          backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
          shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
        }}>
        <View ref={lentille.refBarre} style={{ flexDirection: 'row', alignItems: 'center', height: TAB_BAR_HEIGHT }} {...lentille.panHandlers}>
          {prets && <LentilleVerre lentille={lentille} sombre={isDark} hauteur={TAB_BAR_HEIGHT - 12} haut={6} />}
          {state.routes.map(route => {
            if (route.name === 'plus') {
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
            const i = onglets.findIndex(r => r.key === route.key)
            const on = lentille.survol === i
            return (
              <View key={route.key} onLayout={mesurer(i)} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: actif === i }}
                style={{ width: 66, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={{ alignItems: 'center', gap: 2, transform: [{ scale: prets ? lentille.echelleOnglet(i) : 1 }] }}>
                  <Ionicons name={on ? item.active : item.icon} size={24} color={on ? colors.primary : colors.mutedFg} />
                  <Text size={10.5} weight={on ? 700 : 500} style={{ color: on ? colors.primary : colors.mutedFg }} numberOfLines={1}>{item.label}</Text>
                </Animated.View>
              </View>
            )
          })}
        </View>
      </Glass>
    </View>
  )
}
