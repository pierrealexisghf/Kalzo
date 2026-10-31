import { useCallback, useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { Avatar } from '@/components/Avatar'
import { Button, Card, EmptyState, Header, Screen, Skeleton } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { overview, unblockUser, type FriendRow } from '@/lib/social'
import * as haptics from '@/lib/haptics'

export default function Blocked() {
  const toast = useToast()
  const [list, setList] = useState<FriendRow[] | null>(null)

  const load = useCallback(async () => {
    try { setList((await overview()).blocked) } catch (e) { toast.show((e as Error).message, 'error'); setList([]) }
  }, [toast])
  useEffect(() => { Promise.resolve().then(load) }, [load])

  const unblock = (u: FriendRow) => Alert.alert(`Débloquer @${u.username} ?`, 'Cette personne pourra de nouveau te trouver et t’envoyer une demande d’ami.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Débloquer', onPress: async () => {
      try { await unblockUser(u.username); haptics.success(); toast.show(`@${u.username} est débloqué.`, 'success'); await load() }
      catch (e) { toast.show((e as Error).message, 'error') }
    } },
  ])

  return (
    <Screen>
      <Header title="Utilisateurs bloqués" onBack />
      <Text size={13} color="muted">Les personnes bloquées ne voient plus tes repas ni tes commentaires, et tu ne vois plus les leurs.</Text>
      {list === null ? <Skeleton height={64} radius={24} /> : list.length === 0 ? (
        <EmptyState emoji="🙂" title="Personne n’est bloqué" text="Pour bloquer quelqu’un, ouvre le menu ⋯ d’un de ses posts ou touche son commentaire." />
      ) : list.map(u => (
        <Card key={u.username} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <Avatar name={u.first_name || u.username} username={u.username} />
          <View style={{ flex: 1 }}>
            <Text weight={700} numberOfLines={1}>{u.first_name || u.username}</Text>
            <Text size={12.5} color="muted">@{u.username}</Text>
          </View>
          <Button full={false} size="sm" variant="outline" label="Débloquer" onPress={() => unblock(u)} />
        </Card>
      ))}
    </Screen>
  )
}
