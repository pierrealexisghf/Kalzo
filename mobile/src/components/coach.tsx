import { View } from 'react-native'
import { Card, Skeleton } from './ui/kit'
import { Text } from './ui/Text'
import { useSession } from '@/state/session'

// Le serveur applique l'accès (consume_ai). Côté app, on lit l'offre effective pour griser les outils.
export function useCoachAccess() {
  const { account } = useSession()
  const ai = account?.ai
  return { allowed: !!ai?.coach_access, plan: ai?.plan ?? 'free' }
}

export function Thinking({ text }: { text: string }) {
  return (
    <Card style={{ gap: 12 }}>
      <Text weight={700} center>✨ {text}</Text>
      <Skeleton height={26} /><Skeleton height={70} /><Skeleton height={20} width="60%" />
    </Card>
  )
}

export function Bullets({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <Card style={{ gap: 6 }}>
      <Text size={13} weight={700} color="muted">{title.toUpperCase()}</Text>
      {items.map((i, k) => <View key={k} style={{ flexDirection: 'row', gap: 8 }}><Text color="muted">•</Text><Text style={{ flex: 1 }} size={14.5}>{i}</Text></View>)}
    </Card>
  )
}
