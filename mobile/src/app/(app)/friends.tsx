import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, Share, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/state/session'
import { Avatar } from '@/components/Avatar'
import { Button, Card, EmptyState, Header, Input, Screen, SectionTitle, Skeleton } from '@/components/ui/kit'
import { Stars } from '@/components/ui/Stars'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import {
  cancelRequest, overview, respondRequest, searchUsers, sendRequest, unblockUser,
  type FoundUser, type FriendRow, type Overview,
} from '@/lib/social'
import * as haptics from '@/lib/haptics'

export const APP_LINK = 'https://kalzo.vercel.app'

function Row({ u, children, onPress }: { u: FriendRow; children?: React.ReactNode; onPress?: () => void }) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }} onPress={onPress}>
      <Avatar name={u.first_name || u.username} />
      <View style={{ flex: 1 }}>
        <Text weight={700} numberOfLines={1}>{u.first_name || u.username}</Text>
        <Text size={12.5} color="muted">@{u.username}</Text>
      </View>
      {children}
    </Card>
  )
}

export default function Friends() {
  const router = useRouter()
  const toast = useToast()
  const { account } = useSession()
  const [ov, setOv] = useState<Overview | null>(null)
  const [q, setQ] = useState('')
  const [found, setFound] = useState<FoundUser[] | null>(null)
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => { try { setOv(await overview()) } catch (e) { toast.show((e as Error).message, 'error') } }, [toast])
  useEffect(() => { Promise.resolve().then(load) }, [load])

  // Recherche par préfixe du pseudo (3 caractères minimum), avec un délai de frappe.
  useEffect(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 3) return
    const t = setTimeout(async () => {
      setSearching(true)
      try { setFound(await searchUsers(term)) } catch (e) { toast.show((e as Error).message, 'error') }
      setSearching(false)
    }, 350)
    return () => clearTimeout(t)
  }, [q, toast])
  const results = q.trim().length >= 3 ? found : null

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    try { await fn(); haptics.success(); if (done) toast.show(done, 'success'); await load(); if (q.trim().length >= 3) setFound(await searchUsers(q.trim().toLowerCase())) }
    catch (e) { toast.show((e as Error).message, 'error') }
  }
  const confirm = (title: string, ok: string, fn: () => void) => Alert.alert(title, undefined, [{ text: 'Annuler', style: 'cancel' }, { text: ok, style: 'destructive', onPress: fn }])

  const invite = () => Share.share({ message: `Rejoins-moi sur Kalzo, le BeReal du repas ! Mon pseudo : @${account?.username}. ${APP_LINK}` })

  return (
    <Screen>
      <Header title="Mes amis" onBack />
      <Input value={q} onChangeText={t => { setQ(t); if (t.trim().length < 3) setFound(null) }} placeholder="Chercher un pseudo (3 lettres min.)" autoCapitalize="none" autoCorrect={false} returnKeyType="search" />

      {q.trim().length > 0 && q.trim().length < 3 ? <Text size={13} color="muted">Tape au moins 3 caractères.</Text> : null}
      {searching ? <Skeleton height={60} radius={20} /> : null}
      {results && !searching ? (results.length === 0 ? <Text color="muted" center>Aucun utilisateur trouvé.</Text> : results.map(u => (
        <Row key={u.username} u={u}>
          {u.relation === 'none' ? <Button full={false} size="sm" label="Ajouter" onPress={() => act(() => sendRequest(u.username), 'Demande envoyée')} /> : null}
          {u.relation === 'pending_out' ? <Text size={13} color="muted" weight={700}>Demandé</Text> : null}
          {u.relation === 'pending_in' ? <Button full={false} size="sm" label="Accepter" onPress={() => act(() => respondRequest(u.username, true), 'Vous êtes amis !')} /> : null}
          {u.relation === 'friends' ? <Text size={13} color="nutri" weight={700}>Amis ✓</Text> : null}
        </Row>
      ))) : null}

      {!results && ov === null ? <Skeleton height={120} radius={24} /> : null}
      {!results && ov ? (
        <>
          {ov.incoming.length ? (
            <>
              <SectionTitle>Demandes reçues ({ov.incoming.length})</SectionTitle>
              {ov.incoming.map(u => (
                <Row key={u.username} u={u}>
                  <Button full={false} size="sm" label="Accepter" onPress={() => act(() => respondRequest(u.username, true), 'Vous êtes amis !')} />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Refuser ${u.username}`} onPress={() => act(() => respondRequest(u.username, false))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text color="muted" weight={800} size={18}>✕</Text></Pressable>
                </Row>
              ))}
            </>
          ) : null}
          <SectionTitle>Amis ({ov.friends.length})</SectionTitle>
          {ov.friends.length === 0 ? <EmptyState emoji="👋" title="Pas encore d’amis" text="Cherche un pseudo ci-dessus, ou invite quelqu’un." /> : ov.friends.map(u => (
            <Row key={u.username} u={u} onPress={() => router.push({ pathname: '/friend/[username]', params: { username: u.username } })}>
              {u.avg7 ? <Stars value={Number(u.avg7)} size={13} gap={1} /> : null}
            </Row>
          ))}
          {ov.outgoing.length ? (
            <>
              <SectionTitle>Demandes envoyées</SectionTitle>
              {ov.outgoing.map(u => (
                <Row key={u.username} u={u}><Button full={false} size="sm" variant="outline" label="Annuler" onPress={() => act(() => cancelRequest(u.username))} /></Row>
              ))}
            </>
          ) : null}
          {ov.blocked.length ? (
            <>
              <SectionTitle>Utilisateurs bloqués</SectionTitle>
              {ov.blocked.map(u => (
                <Row key={u.username} u={u}><Button full={false} size="sm" variant="outline" label="Débloquer" onPress={() => confirm(`Débloquer @${u.username} ?`, 'Débloquer', () => act(() => unblockUser(u.username)))} /></Row>
              ))}
            </>
          ) : null}
        </>
      ) : null}
      <Button label="Inviter via…" variant="soft" onPress={invite} />
      <Text size={12} color="muted" center>Le message partage seulement le lien de l’app et ton pseudo. Aucune amitié n’est créée sans ton accord et celui de l’autre.</Text>
    </Screen>
  )
}
