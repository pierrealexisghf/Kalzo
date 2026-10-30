import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { Button, Card, Chip, Field, Header, Input, MacroBar, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/theme'
import { ACTIVITY_LEVELS, GOALS, calculateProfile, fmtMl, nearestActivity, suggestWaterGoal, type Gender, type GoalId } from '@/lib/logic/nutrition'

export default function Goals() {
  const { colors } = useTheme()
  const router = useRouter()
  const toast = useToast()
  const { profile, saveProfile, setWaterGoal, waterGoal, weightGoal } = useData()
  const [goal, setGoal] = useState<GoalId>(profile?.goal ?? 'maintenance')
  const [gender, setGender] = useState<Gender>(profile?.gender ?? 'female')
  const [age, setAge] = useState(String(profile?.age ?? ''))
  const [height, setHeight] = useState(String(profile?.height ?? ''))
  const [weight, setWeight] = useState(String(profile?.weight ?? ''))
  const [activity, setActivity] = useState(nearestActivity(profile?.activity))
  const [water, setWater] = useState(String(waterGoal))
  const [saving, setSaving] = useState(false)
  // Si l'objectif de poids ajuste déjà les calories, on garde cette cible.
  const adapted = !!weightGoal?.adaptCalories
  const plan = useMemo(() => (Number(age) > 0 && Number(height) > 0 && Number(weight) > 0
    ? calculateProfile({ weight, height, age, gender, activity, goal, kcalOverride: adapted ? profile?.kcal : null }) : null), [age, height, weight, gender, activity, goal, adapted, profile?.kcal])

  const save = async () => {
    if (!plan) return
    if (!(plan.age >= 13 && plan.age <= 100 && plan.height >= 100 && plan.height <= 250 && plan.weight >= 30 && plan.weight <= 300)) return toast.show('Vérifie ton âge, ta taille et ton poids.', 'error')
    const w = parseInt(water)
    if (!(w >= 500 && w <= 10000)) return toast.show('Objectif d’eau entre 500 et 10 000 ml.', 'error')
    setSaving(true)
    const ok = await saveProfile(plan)
    if (ok) await setWaterGoal(w)
    setSaving(false)
    if (ok) { toast.show('Profil enregistré', 'success'); router.back() }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Objectifs" subtitle="Tes repères nutritionnels" onBack />
        {GOALS.map(o => (
          <Card key={o.id} onPress={() => setGoal(o.id)} style={goal === o.id ? { borderColor: colors.primary, borderWidth: 2 } : undefined} accessibilityLabel={`${o.label}. ${o.desc}`}>
            <Text weight={700}>{o.label}</Text><Text size={13} color="muted">{o.desc}</Text>
          </Card>
        ))}
        <View style={{ flexDirection: 'row', gap: 10 }}><Chip label="Femme" active={gender === 'female'} onPress={() => setGender('female')} /><Chip label="Homme" active={gender === 'male'} onPress={() => setGender('male')} /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Âge"><Input value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} /></Field></View>
          <View style={{ flex: 1 }}><Field label="Taille (cm)"><Input value={height} onChangeText={setHeight} keyboardType="number-pad" maxLength={3} /></Field></View>
          <View style={{ flex: 1 }}><Field label="Poids (kg)"><Input value={weight} onChangeText={t => setWeight(t.replace(',', '.'))} keyboardType="decimal-pad" maxLength={5} /></Field></View>
        </View>
        {ACTIVITY_LEVELS.map(a => (
          <Card key={a.value} onPress={() => setActivity(a.value)} style={activity === a.value ? { borderColor: colors.primary, borderWidth: 2 } : undefined} accessibilityLabel={`${a.label}. ${a.desc}`}>
            <Text weight={700}>{a.label}</Text><Text size={13} color="muted">{a.desc}</Text>
          </Card>
        ))}
        <Field label="Objectif d’eau (ml)" hint={plan ? `Suggestion : ${fmtMl(suggestWaterGoal(plan.weight))}` : undefined}><Input value={water} onChangeText={setWater} keyboardType="number-pad" /></Field>
        {plan ? (
          <Card style={{ gap: 10 }}>
            <Text size={22} weight={800}>{plan.kcal} kcal / jour</Text>
            {adapted ? <Text size={12.5} color="muted">Ta cible de calories est ajustée par ton objectif de poids.</Text> : null}
            <MacroBar label="Protéines" value={plan.prot} max={plan.prot} color={colors.prot} />
            <MacroBar label="Glucides" value={plan.gluc} max={plan.gluc} color={colors.gluc} />
            <MacroBar label="Lipides" value={plan.lip} max={plan.lip} color={colors.lip} />
          </Card>
        ) : null}
        <Text size={12} color="muted">Ces repères sont des estimations indicatives. Ils ne remplacent pas l’avis d’un médecin ou d’un diététicien.</Text>
        <Button label="Enregistrer" size="lg" onPress={save} loading={saving} disabled={!plan} />
      </Screen>
    </KeyboardAvoidingView>
  )
}
