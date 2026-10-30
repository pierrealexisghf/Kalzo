import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useData } from '@/state/data'
import { Button, Card, Screen, Skeleton, useTone } from '@/components/ui/kit'
import { Stars } from '@/components/ui/Stars'
import { Text } from '@/components/ui/Text'
import { DaySummary } from '@/components/journal/DaySummary'
import { Souvenirs } from '@/components/journal/Souvenirs'
import { TAB_BAR_HEIGHT } from '@/components/FloatingTabBar'
import { useTheme } from '@/theme'
import { addDays, relativeDay, todayKey } from '@/lib/logic/dates'
import { dayTotals, fmtMl, goalProgress } from '@/lib/logic/nutrition'
import { averageStars7d, goodStreak } from '@/lib/logic/score'
import * as haptics from '@/lib/haptics'

export default function Journal() {
  const { colors } = useTheme()
  const router = useRouter()
  const data = useData()
  const [day, setDay] = useState(todayKey())
  const [refreshing, setRefreshing] = useState(false)
  const today = todayKey()
  const water = useTone('water'), sport = useTone('sport')

  const t = dayTotals(data, day)
  const avg = averageStars7d(data.dailyMeals)
  const streak = goodStreak(data.dailyMeals)
  const lastW = data.weightEntries[data.weightEntries.length - 1]
  const gp = data.weightGoal && data.profile ? goalProgress(data.weightGoal, data.weightEntries, data.profile.weight) : null

  const refresh = async () => { setRefreshing(true); await data.reload(); setRefreshing(false) }
  const step = (n: number) => { haptics.select(); setDay(d => addDays(d, n)) }

  if (!data.profile) return <Screen><Skeleton height={200} radius={28} /></Screen>

  return (
    <Screen bottomPad={TAB_BAR_HEIGHT + 24} onRefresh={refresh} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Jour précédent" onPress={() => step(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text size={26} weight={700}>‹</Text></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text size={26} weight={800} accessibilityRole="header" style={{ letterSpacing: -0.5 }}>{relativeDay(day)}</Text>
          {day !== today ? <Pressable accessibilityRole="button" onPress={() => setDay(today)}><Text size={13} weight={700} color="primary">Revenir à aujourd’hui</Text></Pressable> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Jour suivant" disabled={day >= today} onPress={() => step(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: day >= today ? 0.3 : 1 }}><Text size={26} weight={700}>›</Text></Pressable>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => router.push('/profile')} accessibilityLabel="Voir mon profil">
        <View style={{ flex: 1, gap: 4 }}>
          <Text size={12} weight={700} color="muted">MOYENNE 7 JOURS</Text>
          {avg != null ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Stars value={avg} size={20} /><Text weight={800} size={16}>{String(avg).replace('.', ',')}</Text></View> : <Text color="muted" size={14}>Poste un repas pour démarrer</Text>}
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text size={26} weight={800}>🔥 {streak}</Text>
          <Text size={11} color="muted" weight={600}>jour{streak > 1 ? 's' : ''} à 4★+</Text>
        </View>
      </Card>

      <DaySummary profile={data.profile} eaten={t.eaten} burned={t.burned} macros={t.macros} />

      {t.meals.length ? (
        <View style={{ gap: 8 }}>
          {t.meals.map(m => (
            <Card key={m.id} onPress={() => router.push({ pathname: '/meal/[id]', params: { id: m.id, day } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }} accessibilityLabel={`${m.name}, ${Math.round(m.macros.kcal)} kilocalories`}>
              <Text size={26}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text weight={700} numberOfLines={1}>{m.name}</Text>
                <Text size={12} color="muted">{Math.round(m.macros.kcal)} kcal · P {Math.round(m.macros.prot)} · G {Math.round(m.macros.gluc)} · L {Math.round(m.macros.lip)}</Text>
              </View>
              {m.stars ? <Stars value={m.stars} size={13} gap={1} /> : null}
            </Card>
          ))}
        </View>
      ) : <Text color="muted" center size={14}>Aucun repas ce jour-là.</Text>}

      {day !== today ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button variant="soft" label="+ Repas" size="sm" onPress={() => router.push({ pathname: '/meal-manual', params: { day } })} /></View>
          <View style={{ flex: 1 }}><Button variant="soft" tone="sport" label="+ Activité" size="sm" onPress={() => router.push({ pathname: '/sport-add', params: { day } })} /></View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card tone="water" style={{ flex: 1, gap: 6 }} onPress={() => router.push('/water')} accessibilityLabel={`Eau : ${fmtMl(t.water)} sur ${fmtMl(data.waterGoal)}`}>
          <Ionicons name="water" size={22} color={water.main} />
          <Text size={22} weight={800} tabular>{fmtMl(t.water)}</Text>
          <Text size={12} color="muted">sur {fmtMl(data.waterGoal)}</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.card, overflow: 'hidden' }}><View style={{ height: 6, width: `${Math.min(100, (t.water / data.waterGoal) * 100)}%`, backgroundColor: water.main }} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Ajouter 250 millilitres" onPress={() => { haptics.success(); data.addWater(250, day) }} style={{ minHeight: 44, justifyContent: 'center' }}><Text size={14} weight={800} color="water">+ 250 ml</Text></Pressable>
        </Card>
        <Card tone="sport" style={{ flex: 1, gap: 6 }} onPress={() => router.push('/sport-detail')} accessibilityLabel={`Sport : ${Math.round(t.burned)} kilocalories brûlées`}>
          <Ionicons name="barbell" size={22} color={sport.main} />
          <Text size={22} weight={800} tabular>{Math.round(t.burned)}<Text size={13} color="muted"> kcal</Text></Text>
          <Text size={12} color="muted">{t.sports.length ? `${t.sports.length} activité${t.sports.length > 1 ? 's' : ''}` : 'Aucune activité'}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/sport-add', params: { day } })} style={{ minHeight: 44, justifyContent: 'center', marginTop: 'auto' }}><Text size={14} weight={800} color="sport">+ Ajouter</Text></Pressable>
        </Card>
      </View>

      <Card tone="weight" onPress={() => router.push('/weight')} style={{ gap: 4 }} accessibilityLabel="Poids et objectif">
        <Text size={12} weight={700} color="muted">POIDS</Text>
        <Text size={22} weight={800} tabular>{lastW ? `${lastW.weight} kg` : data.profile.weight + ' kg'}</Text>
        {gp ? <Text size={13} color="muted">Objectif {gp.target} kg · {gp.state === 'reached' ? 'atteint 🎉' : `${Math.round(gp.pct)} % du chemin`}</Text> : <Text size={13} color="muted">Touche pour suivre ta courbe et fixer un objectif.</Text>}
      </Card>

      <Souvenirs />
    </Screen>
  )
}
