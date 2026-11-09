import { useMemo, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { setDraft } from '@/state/draft'
import { Button, Card, Chip, EmptyState, Field, Header, Input, MacroPills, Screen, Segmented } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/theme'
import { defaultMealType, recentMeals } from '@/lib/logic/nutrition'

// Open Food Facts : base collaborative libre, sans clé. Valeurs pour 100 g.
const FIELDS = 'code,product_name,product_name_fr,brands,nutriments,serving_quantity,image_small_url'
type Food = { code: string; name: string; brand: string; image?: string; serving: number | null; per100: { kcal: number; prot: number; gluc: number; lip: number; sucres?: number; fibres?: number } }

function toFood(p: any): Food | null {
  const n = p.nutriments || {}
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null)
  const name = (p.product_name_fr || p.product_name || '').trim()
  if (!name || kcal == null) return null
  return {
    code: p.code, name, brand: (p.brands || '').split(',')[0].trim(), image: p.image_small_url,
    per100: { kcal, prot: n.proteins_100g || 0, gluc: n.carbohydrates_100g || 0, lip: n.fat_100g || 0, sucres: n.sugars_100g, fibres: n.fiber_100g },
    serving: Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : null,
  }
}
async function searchFoods(q: string): Promise<Food[]> {
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&lc=fr&cc=fr&fields=${FIELDS}`)
  if (!res.ok) throw new Error('search')
  return ((await res.json()).products || []).map(toFood).filter(Boolean) as Food[]
}
async function fetchBarcode(code: string): Promise<Food | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`)
  if (!res.ok) throw new Error('barcode')
  const data = await res.json()
  return data.status === 1 ? toFood({ ...data.product, code }) : null
}

const num = (v: string) => Math.max(0, Math.round(parseFloat(String(v).replace(',', '.')) || 0))

export default function MealManual() {
  const { colors } = useTheme()
  const router = useRouter()
  const toast = useToast()
  const { day } = useLocalSearchParams<{ day?: string }>()
  const { dailyMeals } = useData()
  const [tab, setTab] = useState<'search' | 'quick' | 'recent'>('search')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Food[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState<Food | null>(null)
  const [grams, setGrams] = useState('100')
  const [scanning, setScanning] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const [f, setF] = useState({ name: '', kcal: '', prot: '', gluc: '', lip: '' })
  const recents = useMemo(() => recentMeals(dailyMeals, 10), [dailyMeals])

  const next = () => router.push({ pathname: '/meal-validate', params: { mode: 'manual', mealType: defaultMealType(), day } })

  const run = async (term = q.trim()) => {
    if (term.length < 2) return
    setLoading(true); setResults(null)
    try {
      if (/^\d{8,14}$/.test(term)) { const food = await fetchBarcode(term); setResults(food ? [food] : []) }
      else setResults(await searchFoods(term))
    } catch { toast.show('Recherche indisponible pour le moment.', 'error'); setResults([]) }
    setLoading(false)
  }
  const onCode = (code: string) => { setScanning(false); setQ(code); run(code) }

  const g = Math.max(0, parseFloat(grams.replace(',', '.')) || 0)
  const scaled = picked ? { kcal: picked.per100.kcal * g / 100, prot: picked.per100.prot * g / 100, gluc: picked.per100.gluc * g / 100, lip: picked.per100.lip * g / 100 } : null

  const confirmFood = () => {
    if (!picked || !scaled || !g || g > 3000) return toast.show('Indique une quantité valide en grammes.', 'error')
    setDraft({ prefill: {
      name: `${picked.name}${picked.brand ? ` (${picked.brand})` : ''} · ${Math.round(g)} g`, emoji: '🛒', source: 'manual',
      macros: { kcal: Math.round(scaled.kcal), prot: Math.round(scaled.prot), gluc: Math.round(scaled.gluc), lip: Math.round(scaled.lip),
        ...(picked.per100.sucres != null ? { sucres: Math.round(picked.per100.sucres * g / 100) } : {}),
        ...(picked.per100.fibres != null ? { fibres: Math.round(picked.per100.fibres * g / 100) } : {}) },
    } })
    next()
  }
  const confirmQuick = () => {
    const kcal = num(f.kcal)
    if (!f.name.trim()) return toast.show('Donne un nom à ce repas.', 'error')
    if (!kcal || kcal > 5000) return toast.show('Indique des calories entre 1 et 5000.', 'error')
    setDraft({ prefill: { name: f.name.trim(), emoji: '🍽️', source: 'quick', macros: { kcal, prot: num(f.prot), gluc: num(f.gluc), lip: num(f.lip) } } })
    next()
  }

  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {permission?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }} onBarcodeScanned={e => onCode(e.data)} />
        ) : (
          <View style={{ flex: 1, padding: 28, justifyContent: 'center', gap: 12 }}>
            <Text color="white" center size={18} weight={700}>Pour scanner un code-barres, Kalzo a besoin de l’appareil photo.</Text>
            <Button label="Continuer" onPress={requestPermission} />
          </View>
        )}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: 290, height: 160, borderRadius: 24, borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)' }} />
          <Text color="white" weight={600} style={{ marginTop: 16 }}>Place le code-barres dans le cadre</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setScanning(false)} style={{ position: 'absolute', top: 60, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
      </View>
    )
  }

  if (picked && scaled) {
    return (
      <Screen>
        <Header title={picked.name} subtitle={picked.brand || 'Produit'} onBack={() => setPicked(null)} />
        <Card style={{ gap: 14 }}>
          <Field label="Quantité (grammes)"><Input value={grams} onChangeText={setGrams} keyboardType="decimal-pad" /></Field>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[50, 100, 150, 200].map(v => <Chip key={v} label={`${v} g`} active={g === v} onPress={() => setGrams(String(v))} />)}
            {picked.serving ? <Chip label="1 portion" active={g === picked.serving} onPress={() => setGrams(String(picked.serving))} /> : null}
          </View>
          <MacroPills kcal={scaled.kcal} prot={scaled.prot} gluc={scaled.gluc} lip={scaled.lip} />
          <Text size={12} color="muted">Pour 100 g : {Math.round(picked.per100.kcal)} kcal · P {picked.per100.prot.toFixed(1)} · G {picked.per100.gluc.toFixed(1)} · L {picked.per100.lip.toFixed(1)}. Source : Open Food Facts.</Text>
        </Card>
        <Button label="Continuer" size="lg" onPress={confirmFood} />
      </Screen>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Saisie manuelle" subtitle="Gratuit et illimité" onBack />
        <Segmented value={tab} onChange={setTab} options={[{ id: 'search', label: 'Rechercher' }, { id: 'quick', label: 'Rapide' }, { id: 'recent', label: 'Récents' }]} />

        {tab === 'search' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Input value={q} onChangeText={setQ} placeholder="Yaourt grec, 3017620422003…" returnKeyType="search" onSubmitEditing={() => run()} style={{ flex: 1 }} autoCorrect={false} />
              <Pressable accessibilityRole="button" accessibilityLabel="Scanner un code-barres" onPress={() => setScanning(true)} style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="barcode-outline" size={26} color={colors.foreground} />
              </Pressable>
            </View>
            {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} /> : null}
            {results && results.length === 0 ? <EmptyState emoji="🔎" title="Aucun résultat" text="Essaie un autre mot, ou utilise l’onglet Rapide." /> : null}
            {results?.map(food => (
              <Card key={food.code + food.name} onPress={() => { setPicked(food); setGrams(String(food.serving || 100)) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                {food.image ? <Image source={{ uri: food.image }} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.muted }} /> : <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.muted }} />}
                <View style={{ flex: 1 }}>
                  <Text weight={700} numberOfLines={1}>{food.name}</Text>
                  <Text size={12} color="muted" numberOfLines={1}>{food.brand || 'Sans marque'} · {Math.round(food.per100.kcal)} kcal / 100 g</Text>
                </View>
              </Card>
            ))}
            {!results && !loading ? <Text size={12.5} color="muted" center>Les valeurs viennent d’Open Food Facts, une base collaborative : vérifie-les sur l’emballage en cas de doute.</Text> : null}
          </>
        ) : null}

        {tab === 'quick' ? (
          <>
            <Card style={{ gap: 14 }}>
              <Field label="Nom du repas"><Input value={f.name} onChangeText={t => setF(s => ({ ...s, name: t }))} placeholder="Sandwich jambon-beurre" maxLength={120} /></Field>
              <Field label="Calories (kcal)"><Input value={f.kcal} onChangeText={t => setF(s => ({ ...s, kcal: t }))} keyboardType="number-pad" placeholder="450" /></Field>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['prot', 'gluc', 'lip'] as const).map(k => (
                  <View key={k} style={{ flex: 1 }}>
                    <Field label={k === 'prot' ? 'Prot. (g)' : k === 'gluc' ? 'Gluc. (g)' : 'Lip. (g)'}>
                      <Input value={f[k]} onChangeText={t => setF(s => ({ ...s, [k]: t }))} keyboardType="decimal-pad" placeholder="0" />
                    </Field>
                  </View>
                ))}
              </View>
            </Card>
            <Button label="Continuer" size="lg" onPress={confirmQuick} />
          </>
        ) : null}

        {tab === 'recent' ? (
          recents.length === 0 ? <EmptyState emoji="🕘" title="Pas encore de repas récents" text="Les repas que tu ajoutes apparaîtront ici pour les ré-ajouter en un geste." /> : recents.map(m => (
            <Card key={m.id} onPress={() => { setDraft({ prefill: { name: m.name, emoji: m.emoji, macros: m.macros, ingredients: m.mainIngredients, source: 'recent' } }); next() }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text size={28}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text weight={700} numberOfLines={1}>{m.name}</Text>
                <Text size={12} color="muted">{Math.round(m.macros.kcal)} kcal · P {Math.round(m.macros.prot)} · G {Math.round(m.macros.gluc)} · L {Math.round(m.macros.lip)}</Text>
              </View>
            </Card>
          ))
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  )
}
