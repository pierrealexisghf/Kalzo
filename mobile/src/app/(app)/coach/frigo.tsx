import { useState } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { Bullets, Thinking } from '@/components/coach'
import { Button, Card, Chip, Field, Header, Input, MacroPills, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { ScanBalance } from '@/components/ScanBalance'
import { useAiCall } from '@/lib/useAiCall'
import { parseAiJson } from '@/lib/ai'
import { MEAL_TYPES, defaultMealType, type Macros } from '@/lib/logic/nutrition'

type Recipe = { name: string; emoji?: string; time?: number; ingredients?: string[]; steps?: string[]; macros: Macros; tip?: string }

export default function Frigo() {
  const router = useRouter()
  const toast = useToast()
  const runAi = useAiCall()
  const { profile, addMeal } = useData()
  const [ingredients, setIngredients] = useState('')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Recipe | null>(null)
  const [mealType, setMealType] = useState(defaultMealType())

  const generate = async () => {
    if (!ingredients.trim()) return toast.show('Liste les ingrédients que tu as.', 'error')
    setLoading(true); setResult(null)
    try {
      const { text } = await runAi('coach', `Tu es un chef cuisinier expert en nutrition. Crée une recette originale et délicieuse avec ces ingrédients disponibles : ${ingredients.trim().slice(0, 800)}. ${prefs.trim() ? 'Préférences : ' + prefs.trim().slice(0, 300) + '.' : ''}
${profile?.kcal ? `Objectif de l'utilisateur : environ ${profile.kcal} kcal par jour, ${profile.prot} g de protéines.` : ''}

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec ce format exact :
{
  "name": "Nom de la recette",
  "emoji": "🍳",
  "time": 20,
  "ingredients": ["200 g de poulet", "100 g de riz"],
  "steps": ["Étape 1…", "Étape 2…"],
  "macros": {"kcal": 450, "prot": 35, "gluc": 40, "lip": 12},
  "tip": "Astuce du chef"
}`, 1200)
      setResult(parseAiJson(text))
    } catch { /* message déjà affiché par useAiCall */ }
    setLoading(false)
  }
  const add = async () => {
    if (!result) return
    const m = await addMeal({ name: result.name, emoji: result.emoji || '🍳', macros: result.macros, mealType, ingredients: result.ingredients?.slice(0, 8), source: 'ai' })
    if (m) { toast.show(`${result.name} ajouté au journal`, 'success'); router.dismissTo('/journal') }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Frigo Vide" subtitle="Une recette avec ce que tu as" onBack />
        {loading ? <Thinking text="Le chef réfléchit…" /> : !result ? (
          <>
            <Field label="Ingrédients disponibles"><Input value={ingredients} onChangeText={setIngredients} multiline maxLength={800} placeholder="Poulet, riz, courgette, crème, œufs…" /></Field>
            <Field label="Préférences (facultatif)"><Input value={prefs} onChangeText={setPrefs} maxLength={300} placeholder="Sans gluten, rapide, épicé…" /></Field>
            <Button label="Trouver une recette" variant="tone" tone="coach" size="lg" onPress={generate} />
            <ScanBalance />
          </>
        ) : (
          <>
            <Card style={{ gap: 10 }}>
              <Text size={44}>{result.emoji}</Text>
              <Text size={22} weight={800}>{result.name}</Text>
              {result.time ? <Text color="muted">⏱ {result.time} min</Text> : null}
              <MacroPills kcal={result.macros.kcal} prot={result.macros.prot} gluc={result.macros.gluc} lip={result.macros.lip} />
            </Card>
            <Bullets title="Ingrédients" items={result.ingredients} />
            <Bullets title="Préparation" items={result.steps?.map((s, i) => `${i + 1}. ${s}`)} />
            {result.tip ? <Card tone="coach"><Text size={14}>👨‍🍳 {result.tip}</Text></Card> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{MEAL_TYPES.map(t => <Chip key={t.id} emoji={t.emoji} label={t.label} active={mealType === t.id} onPress={() => setMealType(t.id)} />)}</View>
            <Button label="Ajouter au journal" size="lg" onPress={add} />
            <Button label="Autre recette" variant="ghost" onPress={() => setResult(null)} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  )
}
