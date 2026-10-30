import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { Button, Card, EmptyState, Field, Header, Input, Screen, SectionTitle } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { formatDay } from '@/lib/logic/dates'
import { goalProgress } from '@/lib/logic/nutrition'

const kg = (n: number) => `${n.toFixed(1).replace('.', ',')} kg`
const STATE: Record<string, string> = { reached: 'Objectif atteint 🎉', ahead: 'En avance sur ta trajectoire', on_track: 'Dans les temps', behind: 'Un peu en retard sur ta trajectoire' }

export default function Weight() {
  const router = useRouter()
  const toast = useToast()
  const { weightEntries, weightGoal, profile, addWeight, removeWeight, saveWeightGoal } = useData()
  const [value, setValue] = useState('')
  const last = weightEntries[weightEntries.length - 1]
  const gp = weightGoal && profile ? goalProgress(weightGoal, weightEntries, profile.weight) : null

  const add = async () => {
    const w = parseFloat(value.replace(',', '.'))
    if (!(w >= 30 && w <= 300)) return toast.show('Indique un poids entre 30 et 300 kg.', 'error')
    await addWeight(Math.round(w * 10) / 10); setValue(''); toast.show('Pesée enregistrée', 'success')
  }
  const del = (date: string) => Alert.alert('Supprimer cette pesée ?', formatDay(date), [
    { text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => removeWeight(date) },
  ])

  return (
    <Screen>
      <Header title="Poids" subtitle={last ? `Dernière pesée : ${kg(last.weight)}` : undefined} onBack />
      <Card tone="weight" style={{ gap: 12 }}>
        <Field label="Poids du jour (kg)"><Input value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={last ? String(last.weight) : '68'} maxLength={5} /></Field>
        <Button label="Enregistrer" variant="tone" tone="weight" onPress={add} disabled={!value} />
      </Card>

      <SectionTitle>Objectif</SectionTitle>
      {gp && weightGoal ? (
        <Card style={{ gap: 8 }}>
          <Text size={18} weight={800}>{kg(gp.start)} → {kg(gp.target)}</Text>
          <Text color="muted">{STATE[gp.state]}</Text>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#8884', overflow: 'hidden' }}><View style={{ height: 8, width: `${gp.pct}%`, backgroundColor: '#7c5cdb' }} /></View>
          <Text size={13} color="muted">{gp.state === 'reached' ? '' : `Arrivée prévue le ${formatDay(gp.endDate, false)} · ${gp.weeksLeft} sem. restantes`}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}><Button label="Modifier" variant="outline" size="sm" onPress={() => router.push('/weight-goal')} /></View>
            <View style={{ flex: 1 }}><Button label="Retirer" variant="ghost" size="sm" onPress={() => saveWeightGoal(null)} /></View>
          </View>
        </Card>
      ) : <Button label="Définir un objectif de poids" variant="soft" tone="weight" onPress={() => router.push('/weight-goal')} />}

      <SectionTitle>Historique</SectionTitle>
      {weightEntries.length === 0 ? <EmptyState emoji="⚖️" title="Aucune pesée" text="Enregistre ton poids pour suivre ton évolution." /> : [...weightEntries].reverse().slice(0, 30).map(e => (
        <Card key={e.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <View style={{ flex: 1 }}><Text weight={700}>{kg(e.weight)}</Text><Text size={12.5} color="muted">{formatDay(e.date)}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer la pesée du ${formatDay(e.date)}`} onPress={() => del(e.date)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text color="destructive" weight={700}>Suppr.</Text></Pressable>
        </Card>
      ))}
    </Screen>
  )
}
