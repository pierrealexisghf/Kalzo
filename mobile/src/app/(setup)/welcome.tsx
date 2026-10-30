import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'
import { useSession } from '@/state/session'
import { useData } from '@/state/data'
import { Button, Card, Chip, Field, Input, MacroBar, Screen } from '@/components/ui/kit'
import { Ring } from '@/components/ui/Ring'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/theme'
import { ACTIVITY_LEVELS, GOALS, calculateProfile, fmtMl, suggestWaterGoal, type Gender, type GoalId } from '@/lib/logic/nutrition'

const GUIDE = [
  { emoji: '📸', title: 'Poste ton repas', text: 'Chaque midi et chaque soir, prends ton assiette en photo et partage-la avec tes amis.' },
  { emoji: '⭐', title: 'Une note, pas de calories', text: 'Chaque repas reçoit de 1 à 5 étoiles, avec les macros. Tes amis ne voient jamais tes calories.' },
  { emoji: '🎁', title: '7 jours pour tout essayer', text: 'Pendant 7 jours, scans IA illimités et coach inclus, sans carte bancaire. Ensuite : 5 scans par semaine en gratuit. Le journal, le feed, les amis, le sport et l’eau restent gratuits.' },
]
const STEPS = GUIDE.length + 4

export default function Welcome() {
  const { colors } = useTheme()
  const { user, account } = useSession()
  const { saveProfile, setWaterGoal } = useData()
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<GoalId>('maintenance')
  const [gender, setGender] = useState<Gender>('female')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activity, setActivity] = useState<number>(1.3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const plan = useMemo(() => {
    if (!(Number(age) > 0 && Number(height) > 0 && Number(weight) > 0)) return null
    return calculateProfile({ weight, height, age, gender, activity, goal })
  }, [age, height, weight, gender, activity, goal])

  const next = () => {
    setError('')
    if (step === GUIDE.length + 1) {
      const a = Number(age), h = Number(height), w = Number(weight)
      if (!(a >= 13 && a <= 100)) return setError('Indique un âge entre 13 et 100 ans.')
      if (!(h >= 100 && h <= 250)) return setError('Indique une taille entre 100 et 250 cm.')
      if (!(w >= 30 && w <= 300)) return setError('Indique un poids entre 30 et 300 kg.')
    }
    setStep(s => s + 1)
  }

  const finish = async () => {
    if (!plan) return
    setSaving(true)
    const ok = await saveProfile(plan)
    if (ok) await setWaterGoal(suggestWaterGoal(plan.weight))
    setSaving(false)
    if (!ok) setError('Profil non enregistré, réessaie.')
  }

  const inGuide = step < GUIDE.length
  const g = GUIDE[step]
  const name = account?.first_name || user?.user_metadata?.first_name

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen style={{ paddingTop: 48 }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Étape ${step + 1} sur ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? colors.primary : colors.muted }} />
          ))}
        </View>

        {inGuide ? (
          <View style={{ alignItems: 'center', gap: 14, paddingTop: 56, paddingBottom: 24 }}>
            <Text size={84}>{g.emoji}</Text>
            <Text size={30} weight={800} center style={{ letterSpacing: -0.6 }}>{step === 0 && name ? `Bienvenue ${name} !` : g.title}</Text>
            {step === 0 && name ? <Text size={20} weight={700} center color="primary">{g.title}</Text> : null}
            <Text size={16} color="muted" center>{g.text}</Text>
          </View>
        ) : null}

        {step === GUIDE.length ? (
          <>
            <Text size={28} weight={800} style={{ letterSpacing: -0.5, marginTop: 8 }}>Quel est ton objectif ?</Text>
            <Text color="muted">Ça sert à calculer tes repères nutritionnels.</Text>
            {GOALS.map(o => (
              <Card key={o.id} onPress={() => setGoal(o.id)} style={goal === o.id ? { borderColor: colors.primary, borderWidth: 2 } : undefined} accessibilityLabel={`${o.label}. ${o.desc}`}>
                <Text weight={700} size={16}>{o.label}</Text>
                <Text color="muted" size={13}>{o.desc}</Text>
              </Card>
            ))}
          </>
        ) : null}

        {step === GUIDE.length + 1 ? (
          <>
            <Text size={28} weight={800} style={{ letterSpacing: -0.5, marginTop: 8 }}>À propos de toi</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Chip label="Femme" active={gender === 'female'} onPress={() => setGender('female')} />
              <Chip label="Homme" active={gender === 'male'} onPress={() => setGender('male')} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Âge"><Input value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="30" maxLength={3} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Taille (cm)"><Input value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="172" maxLength={3} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Poids (kg)"><Input value={weight} onChangeText={t => setWeight(t.replace(',', '.'))} keyboardType="decimal-pad" placeholder="68" maxLength={5} /></Field></View>
            </View>
            {error ? <Text color="destructive" size={13}>{error}</Text> : null}
          </>
        ) : null}

        {step === GUIDE.length + 2 ? (
          <>
            <Text size={28} weight={800} style={{ letterSpacing: -0.5, marginTop: 8 }}>Ton quotidien</Text>
            <Text color="muted">Hors sport : les séances que tu saisis sont comptées à part.</Text>
            {ACTIVITY_LEVELS.map(a => (
              <Card key={a.value} onPress={() => setActivity(a.value)} style={activity === a.value ? { borderColor: colors.primary, borderWidth: 2 } : undefined} accessibilityLabel={`${a.label}. ${a.desc}`}>
                <Text weight={700} size={16}>{a.label}</Text>
                <Text color="muted" size={13}>{a.desc}</Text>
              </Card>
            ))}
          </>
        ) : null}

        {step === GUIDE.length + 3 && plan ? (
          <View style={{ gap: 16, alignItems: 'stretch' }}>
            <Text size={28} weight={800} style={{ letterSpacing: -0.5, marginTop: 8 }}>Tes repères</Text>
            <View style={{ alignItems: 'center' }}>
              <Ring size={190} stroke={16} progress={1} color={colors.nutri}>
                <Text size={44} weight={800} tabular>{plan.kcal}</Text>
                <Text color="muted" size={13}>kcal par jour</Text>
              </Ring>
            </View>
            <MacroBar label="Protéines" value={plan.prot} max={plan.prot} color={colors.prot} />
            <MacroBar label="Glucides" value={plan.gluc} max={plan.gluc} color={colors.gluc} />
            <MacroBar label="Lipides" value={plan.lip} max={plan.lip} color={colors.lip} />
            <Card tone="water"><Text weight={700}>💧 {fmtMl(suggestWaterGoal(plan.weight))} d’eau par jour</Text><Text color="muted" size={13}>Environ 35 ml par kilo.</Text></Card>
            <Text size={12} color="muted" center>Ces repères sont des estimations indicatives. Ils ne remplacent pas l’avis d’un médecin ou d’un diététicien.</Text>
            {error ? <Text color="destructive" size={13} center>{error}</Text> : null}
          </View>
        ) : null}

        <View style={{ flex: 1 }} />
        {step === STEPS - 1 ? (
          <Button label="C’est parti" size="lg" onPress={finish} loading={saving} disabled={!plan} />
        ) : (
          <Button label={step === GUIDE.length - 1 ? 'Configurer mon profil' : 'Continuer'} size="lg" onPress={next} />
        )}
        {step > 0 && step < STEPS ? (
          <Pressable accessibilityRole="button" onPress={() => { setError(''); setStep(s => s - 1) }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text color="muted" weight={600}>Retour</Text>
          </Pressable>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  )
}
