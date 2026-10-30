import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Share, View } from 'react-native'
import { useData } from '@/state/data'
import { Bullets, Thinking } from '@/components/coach'
import { Button, Card, Chip, Field, Header, Input, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { ScanBalance } from '@/components/ScanBalance'
import { useAiCall } from '@/lib/useAiCall'
import { parseAiJson } from '@/lib/ai'

type Result = { totalTime?: number; shoppingList?: string[]; steps?: { order: number; title: string; duration?: number; details?: string }[]; meals?: { day: string; midi: string; soir: string }[]; tips?: string[] }

export default function Batch() {
  const runAi = useAiCall()
  const { profile } = useData()
  const [persons, setPersons] = useState('2')
  const [prefs, setPrefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const generate = async () => {
    setLoading(true); setResult(null)
    try {
      const { text } = await runAi('coach', `Tu es un expert en batch cooking et nutrition. Crée un plan de batch cooking hebdomadaire pour ${persons} personne(s).

Objectif nutritionnel : ${profile?.goal || 'maintenance'} (~${profile?.kcal || 2000} kcal/jour)
${prefs.trim() ? 'Préférences : ' + prefs.trim().slice(0, 300) : ''}

Le batch cooking doit permettre de préparer les repas de toute la semaine en une seule session de cuisine.

Réponds UNIQUEMENT en JSON valide (pas de markdown) :
{"totalTime":120,"shoppingList":["500 g de poulet"],"steps":[{"order":1,"title":"Cuire le riz","duration":15,"details":"…"}],"meals":[{"day":"Lundi","midi":"Nom du plat","soir":"Nom du plat"}],"tips":["Conseil"]}`, 2200)
      setResult(parseAiJson(text))
    } catch { /* déjà géré */ }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Batch cooking" subtitle="Cuisine une fois, mange toute la semaine" onBack />
        {loading ? <Thinking text="Préparation de ta session de cuisine…" /> : !result ? (
          <>
            <Text size={13} weight={600} color="muted">Pour combien de personnes ?</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>{['1', '2', '3', '4'].map(n => <Chip key={n} tone="coach" label={n} active={persons === n} onPress={() => setPersons(n)} />)}</View>
            <Field label="Préférences (facultatif)"><Input value={prefs} onChangeText={setPrefs} maxLength={300} placeholder="Sans porc, beaucoup de légumes…" /></Field>
            <Button label="Créer mon plan" variant="tone" tone="coach" size="lg" onPress={generate} />
            <ScanBalance />
          </>
        ) : (
          <>
            <Card tone="coach"><Text weight={800}>⏱ Session d’environ {result.totalTime} min</Text></Card>
            <Bullets title="Étapes" items={result.steps?.map(s => `${s.order}. ${s.title}${s.duration ? ` (${s.duration} min)` : ''}${s.details ? ` : ${s.details}` : ''}`)} />
            <Bullets title="Menu de la semaine" items={result.meals?.map(m => `${m.day} : ${m.midi} / ${m.soir}`)} />
            <Bullets title="Liste de courses" items={result.shoppingList} />
            <Bullets title="Conseils" items={result.tips} />
            <Button label="Partager la liste de courses" variant="soft" onPress={() => Share.share({ message: (result.shoppingList ?? []).map(i => `• ${i}`).join('\n') })} />
            <Button label="Nouveau plan" variant="ghost" onPress={() => setResult(null)} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  )
}
