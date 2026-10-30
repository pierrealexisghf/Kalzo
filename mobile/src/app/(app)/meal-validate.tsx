import { useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, Switch, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { getDraft, resetDraft, setDraft, useDraft } from '@/state/draft'
import { Button, Card, Chip, Field, Header, Input, MacroPills, Screen, Skeleton } from '@/components/ui/kit'
import { Stars } from '@/components/ui/Stars'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { ScanBalance } from '@/components/ScanBalance'
import { useTheme } from '@/theme'
import { useAiCall } from '@/lib/useAiCall'
import { imageBlock, parseAiJson } from '@/lib/ai'
import { MEAL_TYPES, defaultMealType, type MealTypeId } from '@/lib/logic/nutrition'
import { mealStars } from '@/lib/logic/score'
import { todayKey } from '@/lib/logic/dates'
import { prepareMealPhoto, prepareThumb } from '@/lib/photos'
import * as haptics from '@/lib/haptics'

const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const STAR_TEXT = ['', 'À améliorer', 'Peut mieux faire', 'Correct', 'Très bien', 'Excellent']

function aiPrompt(description: string) {
  return `Analyse ce repas et estime ses valeurs nutritionnelles pour la portion décrite ou visible.
${description.trim() ? 'Description : ' + description.trim().slice(0, 1500) : "Analyse l'image ci-dessus."}

Sois réaliste et généreux dans ton estimation calorique : les plats faits maison comme au restaurant sont très souvent sous-estimés car on oublie l'huile ou le beurre de cuisson, les sauces (crème fraîche, marinades, glaçages sucrés-salés), le fromage et les portions réelles. En cas de doute entre plusieurs estimations plausibles, choisis la plus haute.

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec ce format :
{
  "name": "Nom du repas",
  "emoji": "🍽️",
  "macros": {"kcal": 500, "prot": 30, "gluc": 50, "lip": 15, "sucres": 8, "fibres": 6},
  "ingredients": ["ingrédient avec quantité"],
  "advice": "Conseil nutritionnel court",
  "confidence": "haute|moyenne|basse"
}
"sucres" (dont sucres simples) et "fibres" sont en grammes.`
}

type Base = { name: string; emoji: string; kcal: number; prot: number; gluc: number; lip: number; sucres?: number; fibres?: number }

export default function MealValidate() {
  const { colors } = useTheme()
  const router = useRouter()
  const toast = useToast()
  const runAi = useAiCall()
  const { mode, mealType: mt, day: dayParam } = useLocalSearchParams<{ mode: 'scan' | 'manual'; mealType?: string; day?: string }>()
  const day = dayParam || todayKey()
  const { addMeal, profile } = useData()
  const draft = useDraft()

  const [mealType, setMealType] = useState<MealTypeId>((MEAL_TYPES.find(t => t.id === mt)?.id) ?? defaultMealType())
  const [sharedTouched, setSharedTouched] = useState(false)
  const [shared, setShared] = useState(mealType === 'dejeuner' || mealType === 'diner')
  const [base, setBase] = useState<Base | null>(() => {
    const p = draft.prefill
    return p ? { name: p.name, emoji: p.emoji, ...p.macros, kcal: p.macros.kcal, prot: p.macros.prot, gluc: p.macros.gluc, lip: p.macros.lip } : null
  })
  const [ingredients, setIngredients] = useState<string[]>(draft.prefill?.ingredients ?? [])
  const [advice, setAdvice] = useState('')
  const [confidence, setConfidence] = useState('')
  const [portion, setPortion] = useState(1)
  const [name, setName] = useState(draft.prefill?.name ?? '')
  const [description, setDescription] = useState('')
  const [analyzing, setAnalyzing] = useState(mode === 'scan')
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [source, setSource] = useState<'ai' | 'manual' | 'quick' | 'recent'>(draft.prefill?.source ?? 'manual')

  const analyze = async (desc: string) => {
    const photo = getDraft().photo
    setAnalyzing(true); setFailed(false)
    try {
      const content = [...(photo ? [imageBlock(photo.full.base64)] : []), { type: 'text' as const, text: aiPrompt(desc) }]
      const { text } = await runAi('scan', content, 800)
      const r = parseAiJson(text)
      setBase({ name: r.name || 'Repas', emoji: r.emoji || '🍽️', kcal: +r.macros?.kcal || 0, prot: +r.macros?.prot || 0, gluc: +r.macros?.gluc || 0, lip: +r.macros?.lip || 0, sucres: r.macros?.sucres != null ? +r.macros.sucres : undefined, fibres: r.macros?.fibres != null ? +r.macros.fibres : undefined })
      setName(r.name || 'Repas'); setIngredients(r.ingredients?.slice(0, 8) ?? []); setAdvice(r.advice ?? ''); setConfidence(r.confidence ?? ''); setPortion(1)
      setSource('ai'); haptics.success()
    } catch { setFailed(true) }
    setAnalyzing(false)
  }

  // Lancement automatique de l'analyse à l'arrivée depuis la caméra (1 scan).
  const started = useRef(false)
  useEffect(() => {
    if (mode === 'scan' && !started.current) { started.current = true; Promise.resolve().then(() => analyze('')) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const macros = useMemo(() => base ? {
    kcal: Math.round(base.kcal * portion), prot: Math.round(base.prot * portion), gluc: Math.round(base.gluc * portion), lip: Math.round(base.lip * portion),
    ...(base.sucres != null ? { sucres: Math.round(base.sucres * portion) } : {}), ...(base.fibres != null ? { fibres: Math.round(base.fibres * portion) } : {}),
  } : null, [base, portion])
  const stars = macros && profile ? mealStars({ macros, mealType, dailyKcal: profile.kcal }) : null

  const pickType = (id: MealTypeId) => { setMealType(id); if (!sharedTouched) setShared(id === 'dejeuner' || id === 'diner') }

  const addPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (res.canceled || !res.assets[0]) return
    try {
      const [full, thumb] = await Promise.all([prepareMealPhoto(res.assets[0].uri), prepareThumb(res.assets[0].uri)])
      setDraft({ photo: { full, thumb } })
    } catch { toast.show('Photo illisible.', 'error') }
  }

  const save = async () => {
    if (!macros || !base) return
    setSaving(true)
    const meal = await addMeal({
      name: name.trim() || base.name, emoji: base.emoji, macros, mealType, ingredients, source,
      shared, photo: getDraft().photo,
    }, day)
    setSaving(false)
    if (!meal) return
    haptics.success()
    resetDraft()
    toast.show(shared ? 'Repas publié 🎉' : 'Ajouté au journal', 'success')
    router.dismissTo(shared ? '/feed' : '/journal')
  }

  const photoUri = draft.photo?.full.uri
  const setMacro = (k: 'kcal' | 'prot' | 'gluc' | 'lip', v: string) => {
    const n = Math.max(0, Math.round(parseFloat(v.replace(',', '.')) || 0))
    setBase(b => b ? { ...b, [k]: portion ? n / portion : n } : b)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title={mode === 'scan' ? 'Ton repas' : 'Valider le repas'} onBack={() => { resetDraft(); router.back() }} />

        {photoUri ? (
          <Image source={{ uri: photoUri }} accessibilityLabel="Photo du repas" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24, backgroundColor: colors.muted }} contentFit="cover" />
        ) : (
          <Pressable accessibilityRole="button" onPress={addPhoto} style={{ height: 96, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text weight={700} color="muted">📷 Ajouter une photo (facultatif)</Text>
          </Pressable>
        )}

        {analyzing ? (
          <Card style={{ gap: 12 }}>
            <Text weight={700} center>✨ Analyse de ton repas…</Text>
            <Skeleton height={28} /><Skeleton height={60} /><Skeleton height={20} width="60%" />
          </Card>
        ) : failed || !base ? (
          <Card style={{ gap: 12 }}>
            <Text weight={800} size={17}>L’analyse n’a pas abouti</Text>
            <Text color="muted" size={14}>Ajoute une description pour aider l’IA, ou saisis les valeurs toi-même (gratuit).</Text>
            <Input value={description} onChangeText={setDescription} placeholder="Ex : assiette de poulet grillé, 150 g de riz et salade" multiline maxLength={1500} />
            <Button label="Réessayer avec la description" variant="tone" tone="coach" onPress={() => analyze(description)} disabled={!description.trim() && !photoUri} />
            <Button label="Saisir à la main" variant="outline" onPress={() => { resetDraft(); router.replace('/meal-manual') }} />
            <ScanBalance />
          </Card>
        ) : macros ? (
          <>
            <Card style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text size={36}>{base.emoji}</Text>
                <Input value={name} onChangeText={setName} maxLength={120} accessibilityLabel="Nom du repas" style={{ flex: 1, fontSize: 18, fontFamily: 'Geist_700Bold' }} />
              </View>
              {stars ? (
                <View accessible accessibilityLabel={`${stars} étoiles sur 5. ${STAR_TEXT[stars]}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Stars value={stars} size={26} gap={4} />
                  <Text weight={700} color="muted">{STAR_TEXT[stars]}</Text>
                </View>
              ) : null}
              {editing ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['kcal', 'prot', 'gluc', 'lip'] as const).map(k => (
                    <View key={k} style={{ flex: 1 }}>
                      <Field label={k === 'kcal' ? 'kcal' : k === 'prot' ? 'Prot.' : k === 'gluc' ? 'Gluc.' : 'Lip.'}>
                        <Input keyboardType="decimal-pad" defaultValue={String(macros[k])} onEndEditing={e => setMacro(k, e.nativeEvent.text)} style={{ paddingHorizontal: 8, textAlign: 'center' }} />
                      </Field>
                    </View>
                  ))}
                </View>
              ) : <MacroPills prot={macros.prot} gluc={macros.gluc} lip={macros.lip} kcal={macros.kcal} />}
              <Pressable accessibilityRole="button" onPress={() => setEditing(e => !e)} style={{ minHeight: 36, justifyContent: 'center' }}>
                <Text size={13} weight={700} color="primary">{editing ? 'Terminé' : 'Corriger les valeurs'}</Text>
              </Pressable>
              {source === 'ai' ? (
                <View style={{ gap: 6 }}>
                  <Text size={13} weight={600} color="muted">Portion</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {PORTIONS.map(p => <Chip key={p} label={`×${p}`} active={portion === p} onPress={() => setPortion(p)} />)}
                  </View>
                  {confidence ? <Text size={12} color="muted">Confiance de l’estimation : {confidence}. Ajuste la portion si besoin.</Text> : null}
                </View>
              ) : null}
            </Card>
            {advice ? <Card tone="coach"><Text size={14}>💡 {advice}</Text></Card> : null}
            <View style={{ gap: 8 }}>
              <Text size={13} weight={700} color="muted">TYPE DE REPAS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {MEAL_TYPES.map(t => <Chip key={t.id} emoji={t.emoji} label={t.label} active={mealType === t.id} onPress={() => pickType(t.id)} />)}
              </View>
            </View>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text weight={700}>Partager avec mes amis</Text>
                <Text size={12.5} color="muted">{shared ? 'Tes amis voient la photo, la note et les macros (jamais les calories).' : 'Visible uniquement dans ton journal.'}</Text>
              </View>
              <Switch value={shared} onValueChange={v => { setShared(v); setSharedTouched(true); haptics.select() }} accessibilityLabel="Partager avec mes amis" trackColor={{ true: colors.primary }} />
            </Card>
            {photoUri ? <Text size={12} color="muted" center>Tes photos sont conservées 30 jours, puis supprimées. Le repas et ses étoiles restent dans ton journal.</Text> : null}
            <Button label={shared ? 'Publier' : 'Ajouter au journal'} size="lg" onPress={save} loading={saving} />
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  )
}
