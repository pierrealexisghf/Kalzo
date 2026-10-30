import { Alert, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { Button, Card, EmptyState, Header, Screen, SectionTitle } from '@/components/ui/kit'
import { Bars } from '@/components/ui/Bars'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/theme'
import { relativeDay, shortDay, todayKey, weekDatesOf } from '@/lib/logic/dates'
import { sumBurned } from '@/lib/logic/nutrition'

export default function SportDetail() {
  const { colors } = useTheme()
  const router = useRouter()
  const { dailySport, removeSport } = useData()
  const today = todayKey()
  const week = weekDatesOf(today)
  const vals = week.map(k => sumBurned(dailySport[k] || []))
  const total = vals.reduce((a, b) => a + b, 0)
  const days = week.filter(k => (dailySport[k] || []).length)

  const confirm = (id: string, day: string, name: string) => Alert.alert(`Supprimer « ${name} » ?`, undefined, [
    { text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => removeSport(id, day) },
  ])

  return (
    <Screen>
      <Header title="Sport" subtitle={`${Math.round(total)} kcal brûlées cette semaine`} onBack />
      <Card style={{ gap: 10 }}>
        <Bars values={vals} labels={week.map(shortDay)} color={colors.sport} highlight={week.indexOf(today)} />
      </Card>
      <Button label="Ajouter une activité" variant="tone" tone="sport" onPress={() => router.push('/sport-add')} />
      <SectionTitle>Cette semaine</SectionTitle>
      {days.length === 0 ? <EmptyState emoji="🏃" title="Aucune activité cette semaine" text="Ajoute une séance : le calcul rapide est gratuit." /> : days.slice().reverse().map(k => (
        <View key={k} style={{ gap: 8 }}>
          <Text weight={700} color="muted" size={13}>{relativeDay(k)}</Text>
          {(dailySport[k] || []).map(s => (
            <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text size={28}>{s.emoji}</Text>
              <View style={{ flex: 1 }}><Text weight={700}>{s.name}</Text><Text size={12.5} color="muted">{s.duration} min · {Math.round(s.kcal)} kcal</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer ${s.name}`} onPress={() => confirm(s.id, k, s.name)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text color="destructive" weight={700}>Suppr.</Text></Pressable>
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  )
}
