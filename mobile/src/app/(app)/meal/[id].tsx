import { useState } from 'react'
import { Alert, Pressable, Switch, View } from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { Button, Card, EmptyState, Header, MacroPills, Screen } from '@/components/ui/kit'
import { Stars } from '@/components/ui/Stars'
import { Text } from '@/components/ui/Text'
import { photoGone } from '@/components/MealPhoto'
import { PhotoViewer } from '@/components/PhotoViewer'
import { useTheme } from '@/theme'
import { usePhotoUrl } from '@/lib/usePhotoUrl'
import { MEAL_TYPES, mealTypeOf } from '@/lib/logic/nutrition'
import { formatDay } from '@/lib/logic/dates'
import * as haptics from '@/lib/haptics'

export default function MealDetail() {
  const { colors } = useTheme()
  const router = useRouter()
  const { id, day } = useLocalSearchParams<{ id: string; day: string }>()
  const { dailyMeals, setMealShared, removeMeal } = useData()
  const meal = (dailyMeals[day] || []).find(m => m.id === id) ?? Object.values(dailyMeals).flat().find(m => m.id === id)
  const gone = meal ? photoGone(meal) : false
  const url = usePhotoUrl(meal && !gone ? meal.photoPath : null)
  const [viewer, setViewer] = useState(false)

  if (!meal) return <Screen><Header title="Repas" onBack /><EmptyState emoji="🤷" title="Repas introuvable" /></Screen>
  const realDay = meal.time.slice(0, 10)

  const confirmDelete = () => Alert.alert('Supprimer ce repas ?', meal.photoPath ? 'Le repas et sa photo seront supprimés définitivement.' : 'Le repas sera supprimé définitivement.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => { await removeMeal(meal.id, realDay); haptics.warning(); router.back() } },
  ])

  return (
    <Screen>
      <Header title={meal.name} subtitle={`${formatDay(realDay)} · ${MEAL_TYPES.find(t => t.id === mealTypeOf(meal))?.label}`} onBack />
      {url ? (
        <>
        <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Photo : ${meal.name}. Toucher pour agrandir`} onPress={() => { haptics.tap(); setViewer(true) }}>
          <Image source={{ uri: url }} style={{ width: '100%', aspectRatio: 1, borderRadius: 28, backgroundColor: colors.muted }} contentFit="cover" transition={200} />
        </Pressable>
        <PhotoViewer path={meal.photoPath} visible={viewer} onClose={() => setViewer(false)} label={`Photo : ${meal.name}`} />
        </>
      ) : (
        <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 28 }}>
          <Text size={64}>{meal.emoji}</Text>
          {gone ? <Text size={13} color="muted" center>Photo supprimée après 30 jours</Text> : null}
        </Card>
      )}
      <Card style={{ gap: 14 }}>
        {meal.stars ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Stars value={meal.stars} size={26} gap={4} />
            <Text weight={800} size={18}>{meal.stars}/5</Text>
          </View>
        ) : null}
        <MacroPills kcal={meal.macros.kcal} prot={meal.macros.prot} gluc={meal.macros.gluc} lip={meal.macros.lip} />
        {meal.macros.sucres != null || meal.macros.fibres != null ? (
          <Text size={13} color="muted">{meal.macros.sucres != null ? `Sucres ${Math.round(meal.macros.sucres)} g` : ''}{meal.macros.sucres != null && meal.macros.fibres != null ? ' · ' : ''}{meal.macros.fibres != null ? `Fibres ${Math.round(meal.macros.fibres)} g` : ''}</Text>
        ) : null}
        {meal.mainIngredients?.length ? <Text size={13} color="muted">{meal.mainIngredients.join(' · ')}</Text> : null}
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text weight={700}>Partagé avec mes amis</Text>
          <Text size={12.5} color="muted">{meal.shared ? 'Tes amis le voient dans leur feed (sans les calories).' : 'Visible uniquement par toi.'}</Text>
        </View>
        <Switch value={!!meal.shared} onValueChange={v => { haptics.select(); setMealShared(meal.id, realDay, v) }} accessibilityLabel="Partager avec mes amis" trackColor={{ true: colors.primary }} />
      </Card>
      <Button label="Supprimer ce repas" variant="outline" onPress={confirmDelete} />
    </Screen>
  )
}
