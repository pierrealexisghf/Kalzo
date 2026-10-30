import { View } from 'react-native'
import { Card, MacroBar } from '@/components/ui/kit'
import { Ring } from '@/components/ui/Ring'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/theme'
import type { Profile } from '@/lib/logic/nutrition'

// Résumé du jour, compact et sans jugement négatif.
export function DaySummary({ profile, eaten, burned, macros }: {
  profile: Profile; eaten: number; burned: number; macros: { prot: number; gluc: number; lip: number }
}) {
  const { colors } = useTheme()
  const budget = profile.kcal + burned
  const left = Math.round(budget - eaten)
  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring size={118} stroke={12} progress={budget ? eaten / budget : 0} color={colors.nutri}>
          <Text size={26} weight={800} tabular>{Math.round(eaten)}</Text>
          <Text size={11} color="muted">kcal</Text>
        </Ring>
        <View style={{ flex: 1, gap: 4 }}>
          <Text size={13} weight={700} color="muted">REPÈRE DU JOUR</Text>
          <Text size={22} weight={800} tabular>{profile.kcal} kcal</Text>
          {burned > 0 ? <Text size={13} color="muted">+ {Math.round(burned)} kcal brûlées au sport</Text> : null}
          <Text size={14} weight={600} color={left >= 0 ? 'nutri' : 'muted'}>
            {left >= 0 ? `Il reste ${left} kcal` : `${-left} kcal au-delà du repère`}
          </Text>
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <MacroBar label="Protéines" value={macros.prot} max={profile.prot} color={colors.prot} />
        <MacroBar label="Glucides" value={macros.gluc} max={profile.gluc} color={colors.gluc} />
        <MacroBar label="Lipides" value={macros.lip} max={profile.lip} color={colors.lip} />
      </View>
    </Card>
  )
}
