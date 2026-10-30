import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { Button, Card, Chip, Field, Header, Input, Screen, Segmented, Skeleton } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { ScanBalance } from '@/components/ScanBalance'
import { useTheme } from '@/theme'
import { useAiCall } from '@/lib/useAiCall'
import { parseAiJson } from '@/lib/ai'
import { SPORTS, SPORT_DURATIONS, kcalForMet } from '@/lib/logic/sport'
import { todayKey } from '@/lib/logic/dates'
import * as haptics from '@/lib/haptics'

// Rapide (calcul par MET) et Manuel : gratuits et illimités. Décrire (estimation IA) consomme 1 scan.
export default function SportAdd() {
  const { colors } = useTheme()
  const router = useRouter()
  const toast = useToast()
  const runAi = useAiCall()
  const { day: dayParam } = useLocalSearchParams<{ day?: string }>()
  const day = dayParam || todayKey()
  const { profile, addSport } = useData()
  const weight = profile?.weight || 70
  const [mode, setMode] = useState<'quick' | 'ai' | 'manual'>('quick')
  const [sport, setSport] = useState<(typeof SPORTS)[number] | null>(null)
  const [minutes, setMinutes] = useState(30)
  const [manual, setManual] = useState({ name: '', minutes: '', kcal: '' })
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [ai, setAi] = useState<{ name: string; emoji: string; duration_minutes: number; intensity: string; kcal_burned: number; tip?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const done = (s: { name: string; kcal: number } | null) => {
    setSaving(false)
    if (!s) return
    haptics.success()
    toast.show(`${s.name} ajouté · ${Math.round(s.kcal)} kcal`, 'success')
    router.dismissTo('/journal')
  }
  const saveQuick = async () => { if (!sport) return; setSaving(true); done(await addSport({ name: sport.name, emoji: sport.emoji, kcal: kcalForMet(sport.met, weight, minutes), duration: minutes }, day)) }
  const saveManual = async () => {
    const min = parseInt(manual.minutes), kcal = parseInt(manual.kcal)
    if (!manual.name.trim()) return toast.show("Donne un nom à l'activité.", 'error')
    if (!(min > 0 && min <= 1440)) return toast.show('Indique une durée valide (en minutes).', 'error')
    if (!(kcal >= 0 && kcal <= 10000)) return toast.show('Indique des calories valides.', 'error')
    setSaving(true); done(await addSport({ name: manual.name.trim(), kcal, duration: min }, day))
  }
  const analyze = async () => {
    if (!text.trim()) return toast.show('Décris ton activité.', 'error')
    setLoading(true); setAi(null)
    try {
      const { text: out } = await runAi('scan', `Tu es un expert en physiologie du sport et dépense énergétique.
Profil : ${weight} kg.
Activité décrite : "${text.trim().slice(0, 600)}"

Calcule les calories brûlées. Réponds UNIQUEMENT en JSON valide (pas de markdown) :
{"name":"Nom de l'activité","emoji":"🏃","duration_minutes":30,"intensity":"légère|modérée|intense|très intense","kcal_burned":280,"tip":"Conseil de récupération ou de progression"}`, 500)
      setAi(parseAiJson(out))
    } catch { /* erreur déjà affichée par useAiCall */ }
    setLoading(false)
  }
  const saveAi = async () => { if (!ai) return; setSaving(true); done(await addSport({ name: ai.name, emoji: ai.emoji || '🏃', kcal: ai.kcal_burned, duration: ai.duration_minutes, intensity: ai.intensity }, day)) }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Ajouter une activité" subtitle={`Calcul basé sur ton poids (${weight} kg)`} onBack />
        <Segmented value={mode} onChange={setMode} options={[{ id: 'quick', label: 'Rapide' }, { id: 'ai', label: 'Décrire' }, { id: 'manual', label: 'Manuel' }]} />

        {mode === 'quick' ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SPORTS.map(s => {
                const active = sport?.name === s.name
                return (
                  <Pressable key={s.name} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { haptics.select(); setSport(s) }}
                    style={{ width: '31%', flexGrow: 1, minHeight: 88, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6,
                      backgroundColor: active ? colors.sportSoft : colors.card, borderWidth: active ? 2 : 1, borderColor: active ? colors.sport : colors.border }}>
                    <Text size={28}>{s.emoji}</Text>
                    <Text size={11.5} weight={600} center>{s.name}</Text>
                  </Pressable>
                )
              })}
            </View>
            {sport ? (
              <Card style={{ gap: 12 }}>
                <Text size={13} weight={700} color="muted">DURÉE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SPORT_DURATIONS.map(d => <Chip key={d} tone="sport" label={`${d} min`} active={minutes === d} onPress={() => setMinutes(d)} />)}
                </View>
                <Input value={String(minutes)} onChangeText={t => setMinutes(Math.min(600, Math.max(1, parseInt(t) || 1)))} keyboardType="number-pad" accessibilityLabel="Durée personnalisée en minutes" />
                <Text size={22} weight={800} color="sport">≈ {kcalForMet(sport.met, weight, minutes)} kcal</Text>
              </Card>
            ) : null}
            <Button label="Ajouter" variant="tone" tone="sport" size="lg" disabled={!sport} loading={saving} onPress={saveQuick} />
          </>
        ) : null}

        {mode === 'ai' ? (loading ? (
          <Card style={{ gap: 12 }}><Text weight={700} center>✨ Calcul de la dépense énergétique…</Text><Skeleton height={26} /><Skeleton height={60} /></Card>
        ) : !ai ? (
          <>
            <Field label="Décris ta séance"><Input value={text} onChangeText={setText} multiline maxLength={600} placeholder="1 h de foot en salle avec des amis, puis 10 minutes d’étirements" /></Field>
            <Button label="Estimer avec l’IA · 1 scan" variant="tone" tone="coach" size="lg" onPress={analyze} />
            <ScanBalance />
          </>
        ) : (
          <>
            <Card style={{ alignItems: 'center', gap: 6 }}>
              <Text size={52}>{ai.emoji}</Text>
              <Text size={20} weight={800}>{ai.name}</Text>
              <Text color="muted">{ai.duration_minutes} min · intensité {ai.intensity}</Text>
              <Text size={38} weight={800} color="sport" tabular>{Math.round(ai.kcal_burned)} <Text color="muted" size={15}>kcal</Text></Text>
              {ai.tip ? <Text size={13} color="muted" center>{ai.tip}</Text> : null}
            </Card>
            <Button label="Ajouter au journal" variant="tone" tone="sport" size="lg" loading={saving} onPress={saveAi} />
            <Button label="Modifier ma description" variant="ghost" onPress={() => setAi(null)} />
          </>
        )) : null}

        {mode === 'manual' ? (
          <>
            <Card style={{ gap: 14 }}>
              <Field label="Activité"><Input value={manual.name} onChangeText={t => setManual(m => ({ ...m, name: t }))} placeholder="Escalade" maxLength={120} /></Field>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="Durée (min)"><Input value={manual.minutes} onChangeText={t => setManual(m => ({ ...m, minutes: t }))} keyboardType="number-pad" placeholder="45" /></Field></View>
                <View style={{ flex: 1 }}><Field label="Calories brûlées"><Input value={manual.kcal} onChangeText={t => setManual(m => ({ ...m, kcal: t }))} keyboardType="number-pad" placeholder="300" /></Field></View>
              </View>
            </Card>
            <Button label="Ajouter" variant="tone" tone="sport" size="lg" loading={saving} onPress={saveManual} />
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  )
}
