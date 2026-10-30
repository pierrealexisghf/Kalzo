import { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { Card, EmptyState, Segmented, SectionTitle } from '@/components/ui/kit'
import { Stars } from '@/components/ui/Stars'
import { Text } from '@/components/ui/Text'
import { MealPhoto } from '@/components/MealPhoto'
import { useTheme } from '@/theme'
import { addDays, dateKey, monthLabel, relativeDay, todayKey } from '@/lib/logic/dates'
import { dayStars } from '@/lib/logic/score'
import { mealTypeOf, MEAL_TYPES } from '@/lib/logic/nutrition'
import * as haptics from '@/lib/haptics'

const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function Retrospective() {
  const { dailyMeals } = useData()
  const today = todayKey()
  // Fenêtre d'une semaine centrée sur « il y a 1 mois » : statistiques uniquement (les photos ont disparu).
  const stat = useMemo(() => {
    let sum = 0, n = 0
    for (let i = 27; i <= 34; i++) for (const m of dailyMeals[addDays(today, -i)] || []) if (m.stars) { sum += m.stars; n++ }
    return n >= 3 ? { avg: Math.round((sum / n) * 10) / 10, n } : null
  }, [dailyMeals, today])
  if (!stat) return null
  return (
    <Card tone="weight" style={{ gap: 6 }}>
      <Text size={13} weight={700} color="muted">IL Y A 1 MOIS</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text size={15} weight={600}>Ta moyenne était de {String(stat.avg).replace('.', ',')}</Text>
        <Stars value={stat.avg} size={16} />
      </View>
      <Text size={12.5} color="muted">sur {stat.n} repas notés</Text>
    </Card>
  )
}

function Timeline() {
  const router = useRouter()
  const { dailyMeals } = useData()
  const days = useMemo(() => Object.keys(dailyMeals).filter(k => dailyMeals[k].length).sort().reverse().slice(0, 21), [dailyMeals])
  if (!days.length) return <EmptyState emoji="📖" title="Ton journal est vide" text="Ajoute ton premier repas avec le bouton +. Tes souvenirs apparaîtront ici." />
  return (
    <View style={{ gap: 14 }}>
      {days.map(k => {
        const meals = dailyMeals[k]
        const avg = dayStars(meals)
        return (
          <View key={k} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text weight={700}>{relativeDay(k)}</Text>
              {avg ? <Stars value={avg} size={14} /> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {meals.map(m => (
                <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${m.name}, ${MEAL_TYPES.find(t => t.id === mealTypeOf(m))?.label}`}
                  onPress={() => { haptics.tap(); router.push({ pathname: '/meal/[id]', params: { id: m.id, day: k } }) }}>
                  <MealPhoto path={m.thumbPath} emoji={m.emoji} size={104} radius={18} />
                  {m.stars ? <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3 }}><Stars value={m.stars} size={10} gap={1} /></View> : null}
                </Pressable>
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function MonthGrid() {
  const { colors } = useTheme()
  const router = useRouter()
  const { dailyMeals, loadRange } = useData()
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const first = new Date(cursor.y, cursor.m, 1)
  const daysIn = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const today = todayKey()

  useEffect(() => {
    const from = dateKey(new Date(cursor.y, cursor.m, 1)), to = dateKey(new Date(cursor.y, cursor.m + 1, 1))
    loadRange(from, to)
  }, [cursor, loadRange])

  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)]
  const shift = (d: number) => { haptics.select(); setCursor(c => { const x = new Date(c.y, c.m + d, 1); return { y: x.getFullYear(), m: x.getMonth() } }) }
  const atNow = cursor.y === now.getFullYear() && cursor.m === now.getMonth()

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mois précédent" onPress={() => shift(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text size={24} weight={700}>‹</Text></Pressable>
        <Text size={16} weight={800} accessibilityRole="header">{monthLabel(cursor.y, cursor.m)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Mois suivant" disabled={atNow} onPress={() => shift(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: atNow ? 0.3 : 1 }}><Text size={24} weight={700}>›</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>{WEEK.map((d, i) => <Text key={i} size={11} color="muted" weight={700} center style={{ flex: 1 }}>{d}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (d == null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
          const key = dateKey(new Date(cursor.y, cursor.m, d))
          const meals = dailyMeals[key] || []
          const avg = dayStars(meals)
          const withPhoto = meals.find(m => m.thumbPath)
          const future = key > today
          return (
            <View key={key} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${d}${meals.length ? `, ${meals.length} repas${avg ? `, ${avg} étoiles` : ''}` : ''}`}
                disabled={future || !meals.length} onPress={() => router.push({ pathname: '/meal/[id]', params: { id: meals[0].id, day: key } })}
                style={{ flex: 1, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: meals.length ? colors.nutriSoft : 'transparent', borderWidth: key === today ? 2 : 0, borderColor: colors.primary, opacity: future ? 0.3 : 1 }}>
                {withPhoto ? <MealPhoto path={withPhoto.thumbPath} size={60} radius={0} style={{ width: '100%', height: '100%', position: 'absolute' }} /> : meals.length ? <Text size={16}>{meals[0].emoji}</Text> : null}
                <Text size={10} weight={800} style={{ position: 'absolute', top: 2, left: 4, color: withPhoto ? '#fff' : colors.mutedFg }}>{d}</Text>
                {avg ? <Text size={9.5} weight={800} style={{ position: 'absolute', bottom: 2, right: 4, color: withPhoto ? '#fff' : colors.star }}>★{String(avg).replace('.', ',')}</Text> : null}
              </Pressable>
            </View>
          )
        })}
      </View>
    </Card>
  )
}

export function Souvenirs() {
  const [view, setView] = useState<'fil' | 'mois'>('fil')
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>Souvenirs</SectionTitle>
      <Segmented value={view} onChange={setView} options={[{ id: 'fil', label: 'Fil des jours' }, { id: 'mois', label: 'Calendrier' }]} />
      <Retrospective />
      {view === 'fil' ? <Timeline /> : <MonthGrid />}
    </View>
  )
}
