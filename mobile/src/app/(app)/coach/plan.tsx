import { useState } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { useData } from '@/state/data'
import { Bullets, Thinking } from '@/components/coach'
import { Button, Card, Chip, Field, Header, Input, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { ScanBalance } from '@/components/ScanBalance'
import { useAiCall } from '@/lib/useAiCall'
import { parseAiJson } from '@/lib/ai'
import { GOALS, type GoalId, type MealTypeId } from '@/lib/logic/nutrition'

type M = { name: string; kcal: number; prot: number; gluc: number; lip: number }
type Day = { day: string; breakfast?: M; lunch?: M; dinner?: M; snack?: M; totalKcal?: number }
type Plan = { days: Day[]; shoppingList?: string[]; tips?: string[] }
const MEALS: [keyof Day, string, MealTypeId][] = [['breakfast', '🌅 Petit-déjeuner', 'petit-dejeuner'], ['lunch', '🍽️ Déjeuner', 'dejeuner'], ['dinner', '🌙 Dîner', 'diner'], ['snack', '🍎 Collation', 'collation']]

export default function PlanScreen() {
  const toast = useToast()
  const runAi = useAiCall()
  const { profile, currentPlan, savePlan, addMeal } = useData()
  const [goal, setGoal] = useState<GoalId>(profile?.goal ?? 'maintenance')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(currentPlan)
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState(0)

  const generate = async () => {
    setLoading(true); setPlan(null); setAdded({})
    try {
      const { text } = await runAi('coach', `Tu es un diététicien expert. Crée un plan alimentaire complet sur 7 jours (lundi à dimanche).

Objectif : ${goal} (~${profile?.kcal || 2000} kcal/jour, ${profile?.prot || 120} g de protéines/jour)
${prefs.trim() ? 'Préférences : ' + prefs.trim().slice(0, 300) : ''}

Réponds UNIQUEMENT en JSON valide (pas de markdown), sois concis :
{"days":[{"day":"Lundi","breakfast":{"name":"Nom","kcal":400,"prot":20,"gluc":50,"lip":12},"lunch":{"name":"Nom","kcal":600,"prot":40,"gluc":60,"lip":18},"dinner":{"name":"Nom","kcal":500,"prot":35,"gluc":45,"lip":15},"snack":{"name":"Nom","kcal":200,"prot":10,"gluc":25,"lip":6},"totalKcal":1700}],"shoppingList":["item"],"tips":["conseil"]}`, 2500)
      const parsed = parseAiJson<Plan>(text)
      setPlan(parsed); await savePlan(parsed)
    } catch { /* déjà géré */ }
    setLoading(false)
  }
  const add = async (m: M, type: MealTypeId, key: string) => {
    const meal = await addMeal({ name: m.name, emoji: '🍽️', macros: { kcal: m.kcal, prot: m.prot, gluc: m.gluc, lip: m.lip }, mealType: type, source: 'ai' })
    if (meal) { setAdded(a => ({ ...a, [key]: true })); toast.show(`${m.name} ajouté`, 'success') }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Plan 7 jours" subtitle="Un menu adapté à tes objectifs" onBack />
        {loading ? <Thinking text="Ton diététicien prépare la semaine… (≈ 20 s)" /> : !plan ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{GOALS.map(g => <Chip key={g.id} label={g.short} active={goal === g.id} onPress={() => setGoal(g.id)} />)}</View>
            <Field label="Préférences (facultatif)"><Input value={prefs} onChangeText={setPrefs} maxLength={300} placeholder="Végétarien, sans lactose, budget serré…" /></Field>
            <Button label="Générer mon plan" variant="tone" tone="coach" size="lg" onPress={generate} />
            <ScanBalance />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{plan.days.map((d, i) => <Chip key={i} tone="coach" label={d.day.slice(0, 3)} active={open === i} onPress={() => setOpen(i)} />)}</View>
            {plan.days[open] ? (
              <Card style={{ gap: 12 }}>
                <Text size={18} weight={800}>{plan.days[open].day}{plan.days[open].totalKcal ? ` · ${plan.days[open].totalKcal} kcal` : ''}</Text>
                {MEALS.map(([k, label, type]) => {
                  const m = plan.days[open][k] as M | undefined
                  if (!m) return null
                  const key = `${open}-${k}`
                  return (
                    <View key={k} style={{ gap: 2 }}>
                      <Text size={12} weight={700} color="muted">{label}</Text>
                      <Text weight={700}>{m.name}</Text>
                      <Text size={12.5} color="muted">{m.kcal} kcal · P {m.prot} · G {m.gluc} · L {m.lip}</Text>
                      <Button label={added[key] ? 'Ajouté ✓' : 'Ajouter au journal'} variant="soft" size="sm" disabled={added[key]} full={false} onPress={() => add(m, type, key)} />
                    </View>
                  )
                })}
              </Card>
            ) : null}
            <Bullets title="Liste de courses" items={plan.shoppingList} />
            <Bullets title="Conseils" items={plan.tips} />
            <Button label="Générer un nouveau plan" variant="outline" onPress={() => setPlan(null)} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  )
}
