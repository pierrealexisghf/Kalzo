import { useCallback, useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Avatar } from '@/components/Avatar'
import { PostGrid } from '@/components/PostGrid'
import { Button, Card, EmptyState, Header, Screen, SectionTitle, Skeleton } from '@/components/ui/kit'
import { Stars } from '@/components/ui/Stars'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { blockUser, profileSummary, removeFriend, sharedMeals, type ProfileSummary, type SharedMeal } from '@/lib/social'

export default function FriendProfile() {
  const router = useRouter()
  const toast = useToast()
  const { username } = useLocalSearchParams<{ username: string }>()
  const [p, setP] = useState<ProfileSummary | null | undefined>(undefined)
  const [meals, setMeals] = useState<SharedMeal[]>([])

  const load = useCallback(async () => {
    try {
      const s = await profileSummary(username)
      setP(s)
      if (s) setMeals(await sharedMeals(username))
    } catch (e) { toast.show((e as Error).message, 'error'); setP(null) }
  }, [username, toast])
  useEffect(() => { Promise.resolve().then(load) }, [load])

  const confirm = (title: string, ok: string, fn: () => Promise<unknown>) =>
    Alert.alert(title, undefined, [{ text: 'Annuler', style: 'cancel' }, { text: ok, style: 'destructive', onPress: async () => { await fn().catch(() => {}); router.back() } }])

  if (p === undefined) return <Screen><Header title="Profil" onBack /><Skeleton height={140} radius={28} /></Screen>
  if (p === null) return <Screen><Header title="Profil" onBack /><EmptyState emoji="🙈" title="Profil indisponible" text="Seuls tes amis peuvent voir ce profil." /></Screen>

  return (
    <Screen>
      <Header title={`@${p.username}`} onBack />
      <Card style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={p.first_name || p.username} username={p.username} size={72} />
        <Text size={22} weight={800}>{p.first_name || p.username}</Text>
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 6 }}>
          <View style={{ alignItems: 'center', gap: 4 }}>{p.scores.avg7 != null ? <Stars value={Number(p.scores.avg7)} size={16} /> : <Text color="muted">—</Text>}<Text size={11} color="muted" weight={600}>moyenne 7 jours</Text></View>
          <View style={{ alignItems: 'center' }}><Text size={18} weight={800}>🔥 {p.scores.streak}</Text><Text size={11} color="muted" weight={600}>série à 4★+</Text></View>
          <View style={{ alignItems: 'center' }}><Text size={18} weight={800}>{p.friend_count}</Text><Text size={11} color="muted" weight={600}>amis</Text></View>
        </View>
      </Card>
      <SectionTitle>Repas partagés</SectionTitle>
      <PostGrid meals={meals} />
      {!p.self ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Button label="Retirer des amis" variant="outline" onPress={() => confirm(`Retirer @${p.username} de tes amis ?`, 'Retirer', () => removeFriend(p.username))} />
          <Button label="Bloquer" variant="ghost" onPress={() => confirm(`Bloquer @${p.username} ?`, 'Bloquer', () => blockUser(p.username))} />
        </View>
      ) : null}
    </Screen>
  )
}
