import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useData } from '@/state/data'
import { Thinking } from '@/components/coach'
import { Button, Card, Header, MacroPills, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { ScanBalance } from '@/components/ScanBalance'
import { useTheme } from '@/theme'
import { useAiCall } from '@/lib/useAiCall'
import { imageBlock, parseAiJson } from '@/lib/ai'
import { prepareMealPhoto, type PreparedImage } from '@/lib/photos'
import { defaultMealType, type Macros } from '@/lib/logic/nutrition'

type Dish = { name: string; description?: string; macros: Macros; healthScore?: number; tip?: string }
type Result = { dishes: Dish[]; bestChoice?: string; advice?: string }

export default function Restaurant() {
  const { colors } = useTheme()
  const toast = useToast()
  const runAi = useAiCall()
  const { addMeal } = useData()
  const [photo, setPhoto] = useState<PreparedImage | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [added, setAdded] = useState<Record<number, boolean>>({})

  const pick = async (camera: boolean) => {
    if (camera) { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) return toast.show('Autorise l’appareil photo dans les réglages.', 'error') }
    const res = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (res.canceled || !res.assets[0]) return
    try { setPhoto(await prepareMealPhoto(res.assets[0].uri)) } catch { toast.show('Photo illisible.', 'error') }
  }
  const analyze = async () => {
    if (!photo) return toast.show('Prends la carte en photo.', 'error')
    setLoading(true); setResult(null); setAdded({})
    try {
      const { text } = await runAi('coach', [imageBlock(photo.base64), { type: 'text', text: `Analyse cette carte de restaurant et identifie les plats. Pour chaque plat lisible (8 maximum), estime les valeurs nutritionnelles.

Sois réaliste et généreux dans ton estimation calorique : les plats de restaurant sont systématiquement sous-estimés (huile ou beurre de cuisson, sauces, portions généreuses). En cas de doute, choisis l'estimation la plus haute.

Réponds UNIQUEMENT en JSON valide (pas de markdown) :
{"dishes":[{"name":"Nom du plat","description":"Description courte","macros":{"kcal":600,"prot":30,"gluc":60,"lip":20},"healthScore":7,"tip":"Conseil diététique court"}],"bestChoice":"Nom du meilleur choix nutritionnel","advice":"Conseil général sur ce menu"}` }], 1800)
      setResult(parseAiJson(text))
    } catch { /* déjà géré */ }
    setLoading(false)
  }
  const add = async (d: Dish, i: number) => {
    const m = await addMeal({ name: d.name, emoji: '🍽️', macros: d.macros, mealType: defaultMealType(), source: 'ai' })
    if (m) { setAdded(a => ({ ...a, [i]: true })); toast.show(`${d.name} ajouté`, 'success') }
  }

  return (
    <Screen>
      <Header title="Restaurant" subtitle="Photographie la carte, choisis malin" onBack />
      {loading ? <Thinking text="Lecture de la carte en cours…" /> : !result ? (
        <>
          {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24 }} contentFit="cover" accessibilityLabel="Photo de la carte" /> : (
            <Pressable accessibilityRole="button" onPress={() => pick(true)} style={{ height: 160, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Text size={36}>🧾</Text><Text weight={700} color="muted">Prendre la carte en photo</Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button label="Appareil photo" variant="outline" size="sm" onPress={() => pick(true)} /></View>
            <View style={{ flex: 1 }}><Button label="Photothèque" variant="outline" size="sm" onPress={() => pick(false)} /></View>
          </View>
          <Button label="Analyser la carte" variant="tone" tone="coach" size="lg" disabled={!photo} onPress={analyze} />
          <ScanBalance />
        </>
      ) : (
        <>
          {result.bestChoice ? <Card tone="coach"><Text weight={800}>⭐ Meilleur choix : {result.bestChoice}</Text>{result.advice ? <Text size={13} color="muted">{result.advice}</Text> : null}</Card> : null}
          {result.dishes?.map((d, i) => (
            <Card key={i} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text weight={800} size={16} style={{ flex: 1 }}>{d.name}</Text>{d.healthScore ? <Text weight={800} color="nutri">{d.healthScore}/10</Text> : null}</View>
              {d.description ? <Text size={13} color="muted">{d.description}</Text> : null}
              <MacroPills kcal={d.macros.kcal} prot={d.macros.prot} gluc={d.macros.gluc} lip={d.macros.lip} />
              {d.tip ? <Text size={12.5} color="muted">💡 {d.tip}</Text> : null}
              <Button label={added[i] ? 'Ajouté ✓' : 'Ajouter au journal'} variant={added[i] ? 'soft' : 'outline'} size="sm" disabled={added[i]} onPress={() => add(d, i)} />
            </Card>
          ))}
          <Button label="Nouvelle carte" variant="ghost" onPress={() => { setResult(null); setPhoto(null) }} />
        </>
      )}
    </Screen>
  )
}
