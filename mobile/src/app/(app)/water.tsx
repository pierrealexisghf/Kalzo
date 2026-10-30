import { useState } from 'react'
import { View } from 'react-native'
import { useData } from '@/state/data'
import { Button, Card, Chip, Field, Header, Input, Screen, SectionTitle } from '@/components/ui/kit'
import { Bars } from '@/components/ui/Bars'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/theme'
import { addDays, shortDay, todayKey, weekDatesOf } from '@/lib/logic/dates'
import { fmtMl, suggestWaterGoal } from '@/lib/logic/nutrition'
import * as haptics from '@/lib/haptics'

export default function Water() {
  const { colors } = useTheme()
  const toast = useToast()
  const { dailyWater, waterGoal, addWater, setWater, setWaterGoal, profile } = useData()
  const today = todayKey()
  const week = weekDatesOf(today)
  const vals = week.map(k => dailyWater[k]?.total || 0)
  const logged = vals.filter(v => v > 0)
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0
  const total = dailyWater[today]?.total || 0
  const [exact, setExact] = useState('')
  const [goal, setGoal] = useState(String(waterGoal))

  const correct = async () => {
    const ml = parseInt(exact)
    if (!(ml >= 0 && ml <= 20000)) return toast.show('Indique une quantité en ml.', 'error')
    await setWater(ml); setExact(''); toast.show('Total corrigé', 'success')
  }
  const saveGoal = async () => {
    const g = parseInt(goal)
    if (!(g >= 500 && g <= 10000)) return toast.show('Objectif entre 500 et 10 000 ml.', 'error')
    await setWaterGoal(g); toast.show('Objectif enregistré', 'success')
  }
  void addDays

  return (
    <Screen>
      <Header title="Hydratation" subtitle={`${fmtMl(total)} sur ${fmtMl(waterGoal)} aujourd’hui`} onBack />
      <Card tone="water" style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[150, 250, 330, 500, 1000].map(ml => <Chip key={ml} tone="water" label={`+ ${fmtMl(ml)}`} onPress={() => { haptics.success(); addWater(ml) }} />)}
        </View>
      </Card>
      <SectionTitle>Cette semaine</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Bars values={vals} labels={week.map(shortDay)} color={colors.water} goal={waterGoal} highlight={week.indexOf(today)} />
        <Text size={13} color="muted">Moyenne : {avg ? fmtMl(Math.round(avg)) : '—'} par jour renseigné</Text>
      </Card>
      <SectionTitle>Corriger aujourd’hui</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Field label="Total du jour (ml)"><Input value={exact} onChangeText={setExact} keyboardType="number-pad" placeholder={String(total)} /></Field>
        <Button label="Corriger le total" variant="soft" tone="water" onPress={correct} disabled={!exact} />
      </Card>
      <SectionTitle>Objectif</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Field label="Objectif quotidien (ml)" hint={profile ? `Suggestion selon ton poids : ${fmtMl(suggestWaterGoal(profile.weight))}` : undefined}>
          <Input value={goal} onChangeText={setGoal} keyboardType="number-pad" />
        </Field>
        <Button label="Enregistrer l’objectif" variant="soft" tone="water" onPress={saveGoal} />
      </Card>
    </Screen>
  )
}
