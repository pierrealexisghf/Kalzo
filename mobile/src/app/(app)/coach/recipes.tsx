import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useData } from '@/state/data'
import { Button, Card, Chip, Header, Input, MacroPills } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/theme'
import { BREAKFAST_RECIPES, RECIPES, type Recipe } from '@/data/recipes'
import { MEAL_TYPES, defaultMealType, type MealTypeId } from '@/lib/logic/nutrition'

const CATS = [{ id: 'all', label: 'Toutes' }, { id: 'breakfast', label: 'Petits-déj' }, { id: 'rapide', label: '⏱ Rapides' }, { id: 'sèche', label: 'Légères' }, { id: 'masse', label: 'Riches' }]
const ALL = [...RECIPES, ...BREAKFAST_RECIPES]
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Recipes() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()
  const { addMeal } = useData()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [open, setOpen] = useState<Recipe | null>(null)
  const [mealType, setMealType] = useState<MealTypeId>(defaultMealType())

  const list = useMemo(() => {
    let l = ALL
    if (cat === 'breakfast') l = BREAKFAST_RECIPES
    else if (cat === 'rapide') l = ALL.filter(r => r.time <= 20 || r.tags?.includes('rapide'))
    else if (cat !== 'all') l = ALL.filter(r => r.tags?.includes(cat))
    const term = norm(q.trim())
    return term ? l.filter(r => norm(r.name).includes(term) || r.mainIngredients?.some(i => norm(i).includes(term))) : l
  }, [q, cat])

  const add = async (r: Recipe) => {
    const m = await addMeal({ name: r.name, emoji: r.emoji || '🍽️', macros: r.macros, ingredients: r.mainIngredients, mealType, source: 'manual' })
    if (m) { toast.show(`${r.name} ajouté`, 'success'); setOpen(null); router.dismissTo('/journal') }
  }

  if (open) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <Header title={open.name} subtitle={`⏱ ${open.time} min`} onBack={() => setOpen(null)} />
        <MacroPills kcal={open.macros.kcal} prot={open.macros.prot} gluc={open.macros.gluc} lip={open.macros.lip} />
        <Card style={{ gap: 6 }}><Text size={13} weight={700} color="muted">INGRÉDIENTS</Text>{open.ingredients?.map((i, k) => <Text key={k}>• {i}</Text>)}</Card>
        {open.instructions ? <Card style={{ gap: 6 }}><Text size={13} weight={700} color="muted">PRÉPARATION</Text><Text>{open.instructions}</Text></Card> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{MEAL_TYPES.map(t => <Chip key={t.id} emoji={t.emoji} label={t.label} active={mealType === t.id} onPress={() => setMealType(t.id)} />)}</View>
        <Button label="Ajouter au journal" size="lg" onPress={() => add(open)} />
      </ScrollView>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
        <Header title="Recettes" subtitle={`${list.length} idées équilibrées`} onBack />
        <Input value={q} onChangeText={setQ} placeholder="Poulet, avocat, rapide…" autoCorrect={false} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{CATS.map(c => <Chip key={c.id} label={c.label} active={cat === c.id} onPress={() => setCat(c.id)} />)}</ScrollView>
      </View>
      <FlashList data={list} keyExtractor={r => String(r.id)} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        renderItem={({ item: r }) => (
          <View style={{ paddingBottom: 8 }}>
            <Card onPress={() => setOpen(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }} accessibilityLabel={`${r.name}, ${r.time} minutes, ${r.macros.kcal} kilocalories`}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.nutriSoft, alignItems: 'center', justifyContent: 'center' }}><Text size={28}>{r.emoji || '🍽️'}</Text></View>
              <View style={{ flex: 1 }}><Text weight={700} numberOfLines={1}>{r.name}</Text><Text size={12.5} color="muted">⏱ {r.time} min · {r.macros.kcal} kcal · {r.macros.prot} g prot.</Text></View>
            </Card>
          </View>
        )} />
    </View>
  )
}
