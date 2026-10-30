import { useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useData } from '@/state/data'
import { resetDraft } from '@/state/draft'
import { Button, Chip, Field, Input, useTone, type Tone } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { ScanBalance } from '@/components/ScanBalance'
import { radius, useTheme } from '@/theme'
import * as haptics from '@/lib/haptics'
import { defaultMealType, fmtMl } from '@/lib/logic/nutrition'
import { todayKey } from '@/lib/logic/dates'

const WATER_STEP = 250
const OTHER_ML = [150, 330, 500, 1000]

function BigAction({ tone, icon, title, text, onPress, onLongPress, children }: {
  tone: Tone; icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onPress: () => void; onLongPress?: () => void; children?: React.ReactNode
}) {
  const t = useTone(tone)
  const { colors } = useTheme()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${text}`} onPress={onPress} onLongPress={onLongPress} delayLongPress={350}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 72, borderRadius: radius.xl, backgroundColor: t.soft, borderWidth: 1, borderColor: colors.border, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: t.main, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={26} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text size={17} weight={800}>{title}</Text>
        <Text size={13} color="muted">{text}</Text>
        {children}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedFg} />
    </Pressable>
  )
}

// Petit verre qui se remplit à chaque ajout d'eau.
function Glass({ pct }: { pct: number }) {
  const { colors } = useTheme()
  const h = useSharedValue(0)
  useEffect(() => { h.value = withSpring(Math.max(0.08, Math.min(1, pct)), { damping: 14 }) }, [pct, h])
  const a = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }))
  return (
    <View style={{ width: 34, height: 44, borderWidth: 2.5, borderColor: colors.water, borderRadius: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' }}>
      <Animated.View style={[{ backgroundColor: colors.water, opacity: 0.85 }, a]} />
    </View>
  )
}

type View_ = 'main' | 'meal' | 'weight'

export default function AddSheet() {
  const router = useRouter()
  const toast = useToast()
  const { colors } = useTheme()
  const { addWater, setWater, dailyWater, waterGoal, addWeight, weightEntries, profile } = useData()
  const [view, setView] = useState<View_>('main')
  const [undo, setUndo] = useState<{ added: number; prev: number } | null>(null)
  const [picker, setPicker] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = dailyWater[todayKey()]?.total || 0
  const [weight, setWeight] = useState(String(weightEntries[weightEntries.length - 1]?.weight ?? profile?.weight ?? ''))

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Referme la feuille, puis ouvre l'écran suivant (une feuille ne se « remplace » pas proprement).
  const go = (href: Parameters<typeof router.push>[0]) => { router.back(); setTimeout(() => router.push(href), 320) }

  const drink = async (ml: number) => {
    haptics.success()
    const prev = total
    await addWater(ml)
    setUndo({ added: ml, prev: undo ? undo.prev : prev })
    setPicker(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setUndo(null), 5000)
  }
  const cancel = async () => {
    if (!undo) return
    haptics.tap()
    await setWater(undo.prev)
    setUndo(null)
  }

  const saveWeight = async () => {
    const w = parseFloat(weight.replace(',', '.'))
    if (!(w >= 30 && w <= 300)) return toast.show('Indique un poids entre 30 et 300 kg.', 'error')
    await addWeight(Math.round(w * 10) / 10)
    haptics.success()
    router.back()
  }

  if (view === 'meal') {
    return (
      <View style={{ padding: 20, gap: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => setView('main')} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text color="muted" weight={600}>‹ Retour</Text>
        </Pressable>
        <Text size={24} weight={800}>Ajouter un repas</Text>
        <BigAction tone="coach" icon="camera" title="Scanner avec une photo" text="L’IA estime les valeurs · 1 scan" onPress={() => { resetDraft(); go({ pathname: '/capture', params: { mealType: defaultMealType() } }) }}>
          <View style={{ marginTop: 4 }}><ScanBalance compact /></View>
        </BigAction>
        <BigAction tone="nutri" icon="create" title="Saisie manuelle" text="Recherche, repas rapide, récents · gratuit" onPress={() => { resetDraft(); go('/meal-manual') }} />
      </View>
    )
  }

  if (view === 'weight') {
    return (
      <View style={{ padding: 20, gap: 14 }}>
        <Pressable accessibilityRole="button" onPress={() => setView('main')} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text color="muted" weight={600}>‹ Retour</Text>
        </Pressable>
        <Text size={24} weight={800}>Mon poids</Text>
        <Field label="Poids du jour (kg)">
          <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={5} autoFocus />
        </Field>
        <Button label="Enregistrer" tone="weight" variant="tone" size="lg" onPress={saveWeight} />
      </View>
    )
  }

  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Text size={24} weight={800}>Ajouter</Text>
      <BigAction tone="nutri" icon="restaurant" title="Repas" text="Photo ou saisie manuelle" onPress={() => setView('meal')} />
      <BigAction tone="sport" icon="barbell" title="Sport" text="Rapide, manuel ou décrit à l’IA" onPress={() => go('/sport-add')} />
      <BigAction tone="water" icon="water" title="Hydratation" text={`+${WATER_STEP} ml en un tap · appui long : autres quantités`}
        onPress={() => drink(WATER_STEP)} onLongPress={() => { haptics.select(); setPicker(p => !p) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Glass pct={waterGoal ? total / waterGoal : 0} />
          <Text size={13} weight={700} color="water" tabular>{fmtMl(total)} sur {fmtMl(waterGoal)}</Text>
        </View>
      </BigAction>
      {picker ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {OTHER_ML.map(ml => <Chip key={ml} tone="water" label={fmtMl(ml)} onPress={() => drink(ml)} />)}
        </View>
      ) : null}
      {undo ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.foreground }}>
          <Text color="white" weight={700} size={14} style={{ flex: 1 }}>+{undo.added} ml · {fmtMl(total)} sur {fmtMl(waterGoal)}</Text>
          <Pressable accessibilityRole="button" onPress={cancel} hitSlop={12} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
            <Text color="white" weight={800}>Annuler</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => setView('weight')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 }}>
        <Ionicons name="scale-outline" size={18} color={colors.weight} />
        <Text weight={700} color="weight">Enregistrer mon poids</Text>
      </Pressable>
    </View>
  )
}
