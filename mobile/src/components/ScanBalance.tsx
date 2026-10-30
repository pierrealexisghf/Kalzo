import { useState } from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './ui/Text'
import { useSession } from '@/state/session'
import { useTheme } from '@/theme'
import { scansLeftLabel } from '@/lib/logic/quota'

// Affiche toujours le solde : « 3 scans restants cette semaine · remise à zéro lundi ».
export function ScanBalance({ compact }: { compact?: boolean }) {
  const { colors } = useTheme()
  const { account } = useSession()
  const [now] = useState(() => Date.now())
  const ai = account?.ai
  if (!ai) return null
  let text: string
  if (ai.plan === 'trial' && ai.trial_ends_at) {
    const days = Math.max(0, Math.ceil((new Date(ai.trial_ends_at).getTime() - now) / 86400000))
    text = `Essai gratuit : scans illimités · plus que ${days} jour${days > 1 ? 's' : ''}`
  } else text = scansLeftLabel(ai.remaining)
  const low = ai.remaining != null && ai.remaining <= 1
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: compact ? 'flex-start' : 'center' }} accessibilityLabel={text} accessible>
      <Ionicons name="sparkles" size={14} color={low ? colors.destructive : colors.coach} />
      <Text size={12.5} color={low ? 'destructive' : 'muted'} weight={600}>{text}</Text>
    </View>
  )
}
