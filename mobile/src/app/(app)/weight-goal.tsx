import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, Switch, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { Button, Card, Chip, Field, Header, Input, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/theme'
import { GOAL_DURATIONS, calculateProfile, nearestActivity, planWeightGoal } from '@/lib/logic/nutrition'
import { addDays, formatDay, todayKey } from '@/lib/logic/dates'

const kg = (n: number) => `${Math.abs(n).toFixed(1).replace('.', ',')} kg`

export default function WeightGoalScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const toast = useToast()
  const { profile, weightEntries, weightGoal, dailyMeals, saveProfile, saveWeightGoal } = useData()
  const current = weightEntries[weightEntries.length - 1]?.weight ?? profile?.weight ?? 70
  const tracksMeals = useMemo(() => { let d = 0; for (let i = 0; i < 7; i++) if (dailyMeals[addDays(todayKey(), -i)]?.length) d++; return d >= 3 }, [dailyMeals])
  const [target, setTarget] = useState(weightGoal?.targetWeight ? String(weightGoal.targetWeight).replace('.', ',') : '')
  const [weeks, setWeeks] = useState(weightGoal?.v === 2 && weightGoal.weeks ? weightGoal.weeks : 12)
  const [adapt, setAdapt] = useState(weightGoal?.v === 2 ? !!weightGoal.adaptCalories : tracksMeals)
  const [saving, setSaving] = useState(false)
  if (!profile) return null

  const t = parseFloat(target.replace(',', '.'))
  const plan = planWeightGoal({ current, target: t, weeks, gender: profile.gender, age: profile.age, activity: nearestActivity(profile.activity), height: profile.height })
  const valid = plan.status === 'ok' && t >= 30 && t <= 300
  const p = plan as Extract<typeof plan, { delta: number }>

  const save = async () => {
    if (!valid) return
    setSaving(true)
    await saveWeightGoal({ v: 2, targetWeight: t, weeks, startDate: todayKey(), startWeight: current, adaptCalories: adapt, dailyDelta: p.dailyDelta || 0 })
    const common = { ...profile, weight: current, activity: nearestActivity(profile.activity) }
    if (adapt) await saveProfile(calculateProfile({ ...common, goal: p.direction as 'seche', kcalOverride: p.kcalTarget ?? p.tdee }))
    else if (weightGoal?.adaptCalories) await saveProfile(calculateProfile(common))
    setSaving(false)
    toast.show(adapt ? 'Objectif enregistré, calories ajustées' : 'Objectif enregistré', 'success')
    router.back()
  }

  const warn = (children: React.ReactNode) => <Card tone="sport"><Text size={13} color="sport">{children}</Text></Card>

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Objectif de poids" subtitle={`Poids actuel : ${kg(current)}`} onBack />
        <Field label="Poids cible (kg)"><Input value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="68" maxLength={5} /></Field>
        <Text size={13} weight={600} color="muted">En combien de temps ?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{GOAL_DURATIONS.map(w => <Chip key={w} tone="weight" label={`${w} sem.`} active={weeks === w} onPress={() => setWeeks(w)} />)}</View>
        <Input value={String(weeks)} onChangeText={x => setWeeks(Math.min(104, Math.max(1, parseInt(x) || 1)))} keyboardType="number-pad" accessibilityLabel="Durée personnalisée en semaines" />

        {t > 0 && plan.status === 'minor' ? warn('Avant 18 ans, aucun objectif de perte de poids n’est proposé. Parles-en à un médecin si tu te poses des questions.') : null}
        {t > 0 && (plan.status === 'too_fast' || plan.status === 'floor') ? warn(
          <>{plan.status === 'too_fast'
            ? `Rythme trop rapide (${p.weeklyRate.toFixed(1).replace('.', ',')} kg par semaine, au-delà du plafond recommandé d’environ ${(p.maxRate ?? 0).toFixed(1).replace('.', ',')} kg).`
            : `Pour tenir cette échéance, il faudrait descendre sous ${profile.gender === 'male' ? '1 500' : '1 200'} kcal par jour, ce qui n’est pas recommandé.`}
            {p.suggestWeeks ? ` Choisis au moins ${p.suggestWeeks} semaines.` : ' Cet objectif n’est pas réalisable en sécurité.'}</>) : null}
        {plan.status === 'too_fast' || plan.status === 'floor' ? (p.suggestWeeks ? <Button label={`Utiliser ${p.suggestWeeks} semaines`} variant="soft" tone="sport" size="sm" onPress={() => setWeeks(p.suggestWeeks!)} /> : null) : null}
        {plan.status === 'ok' ? (
          <Card tone="weight" style={{ gap: 4 }}>
            <Text weight={800} color="weight">{p.direction === 'maintenance' ? 'Maintenir ton poids' : `${p.direction === 'seche' ? 'Perdre' : 'Prendre'} ${kg(p.delta)}`}</Text>
            {p.direction !== 'maintenance' ? <Text size={13}>Soit environ {p.weeklyRate.toFixed(2).replace('.', ',')} kg par semaine, arrivée le {formatDay(p.end, false)}.</Text> : null}
          </Card>
        ) : null}
        {plan.status === 'ok' && p.direction !== 'maintenance' ? (
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: adapt }} onPress={() => setAdapt(a => !a)}>
            <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text weight={700}>Adapter mon objectif de calories</Text>
                <Text size={12.5} color="muted">{adapt ? `Ton objectif passera de ${profile.kcal} à ${p.kcalTarget} kcal/jour. Utile si tu enregistres tes repas.` : 'Tes calories ne changent pas : l’objectif sert de repère, comparé à tes pesées.'}</Text>
              </View>
              <Switch value={adapt} onValueChange={setAdapt} trackColor={{ true: colors.primary }} />
            </Card>
          </Pressable>
        ) : null}
        <Text size={12} color="muted">Estimation indicative, qui ne remplace pas l’avis d’un médecin ou d’un diététicien. Le résultat réel dépend de ton alimentation et de ton activité.</Text>
        <Button label="Enregistrer l’objectif" variant="tone" tone="weight" size="lg" disabled={!valid} loading={saving} onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  )
}
