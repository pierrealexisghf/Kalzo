import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, View } from 'react-native'
import { useIsFocused, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/state/session'
import { useData } from '@/state/data'
import { Avatar } from '@/components/Avatar'
import { PostGrid } from '@/components/PostGrid'
import { Group, Row } from '@/components/Row'
import { Card, Screen, SectionTitle, Segmented } from '@/components/ui/kit'
import { Stars } from '@/components/ui/Stars'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { TAB_BAR_HEIGHT } from '@/components/FloatingTabBar'
import { useTheme } from '@/theme'
import { PLAN_LABEL } from '@/lib/logic/quota'
import { averageStars7d, goodStreak } from '@/lib/logic/score'
import { overview, sharedMeals, type SharedMeal } from '@/lib/social'
import * as haptics from '@/lib/haptics'

export const SITE = 'https://kalzo.vercel.app'

export default function Profile() {
  const { pref, setPref } = useTheme()
  const router = useRouter()
  const toast = useToast()
  const focused = useIsFocused()
  const { user, account, signOut } = useSession()
  const data = useData()
  const [meals, setMeals] = useState<SharedMeal[]>([])
  const [friends, setFriends] = useState(0)
  const username = account?.username
  const name = account?.first_name || username || ''
  const avg = averageStars7d(data.dailyMeals)
  const streak = goodStreak(data.dailyMeals)

  useEffect(() => {
    if (!focused || !username) return
    let alive = true
    sharedMeals(username, undefined, 24).then(m => { if (alive) setMeals(m) }).catch(() => {})
    overview().then(o => { if (alive) setFriends(o.friends.length) }).catch(() => {})
    return () => { alive = false }
  }, [focused, username])

  const exportData = useCallback(async () => {
    toast.show('Préparation de ton export…')
    const { data: res, error } = await supabase.functions.invoke('export-data', { method: 'GET' })
    if (error) return toast.show('Export impossible pour le moment.', 'error')
    const file = new File(Paths.cache, 'kalzo-mes-donnees.json')
    file.create({ overwrite: true })
    file.write(typeof res === 'string' ? res : JSON.stringify(res, null, 2))
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Mes données Kalzo' })
  }, [toast])

  const deleteAccount = () => Alert.alert(
    'Supprimer mon compte ?',
    'Toutes tes données (repas, photos, amis, commentaires) seront effacées définitivement. Si tu as un abonnement via l’App Store, résilie-le aussi dans les réglages Apple : la suppression du compte ne l’arrête pas.',
    [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer définitivement', style: 'destructive', onPress: async () => {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
      if (error) return toast.show('La suppression a échoué, réessaie.', 'error')
      haptics.warning(); await signOut()
    } }],
  )

  const plan = account?.ai ? PLAN_LABEL[account.ai.plan as keyof typeof PLAN_LABEL] ?? account.ai.plan : '—'

  return (
    <Screen bottomPad={TAB_BAR_HEIGHT + 24}>
      <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
        <Avatar name={name} size={76} />
        <Text size={24} weight={800}>{name}</Text>
        <Text color="muted">@{username}</Text>
        <View style={{ flexDirection: 'row', gap: 26, marginTop: 10 }}>
          <View style={{ alignItems: 'center', gap: 4 }}>{avg != null ? <Stars value={avg} size={16} /> : <Text color="muted">—</Text>}<Text size={11} color="muted" weight={600}>moyenne 7 jours</Text></View>
          <View style={{ alignItems: 'center' }}><Text size={18} weight={800}>🔥 {streak}</Text><Text size={11} color="muted" weight={600}>série à 4★+</Text></View>
          <View style={{ alignItems: 'center' }}><Text size={18} weight={800}>{friends}</Text><Text size={11} color="muted" weight={600}>amis</Text></View>
        </View>
      </Card>

      <SectionTitle>Mes posts</SectionTitle>
      <PostGrid meals={meals} mine />

      <SectionTitle>Compte</SectionTitle>
      <Group>
        <Row icon="people-outline" title="Mes amis" onPress={() => router.push('/friends')} />
        <Row icon="at" title="Modifier mon pseudo" value={`@${username}`} onPress={() => router.push('/settings/username')} />
        <Row icon="flag-outline" title="Objectifs et profil nutritionnel" value={data.profile ? `${data.profile.kcal} kcal` : undefined} onPress={() => router.push('/settings/goals')} />
        <Row icon="notifications-outline" title="Notifications et rappels" onPress={() => router.push('/settings/notifications')} />
        <Row icon="sparkles-outline" title="Abonnement" value={plan} onPress={() => router.push('/subscription')} last />
      </Group>

      <SectionTitle>Apparence</SectionTitle>
      <Segmented value={pref} onChange={setPref} options={[{ id: 'system', label: 'Auto' }, { id: 'light', label: 'Clair' }, { id: 'dark', label: 'Sombre' }]} />

      <SectionTitle>Aide et légal</SectionTitle>
      <Group>
        <Row icon="help-circle-outline" title="Aide et contact" onPress={() => Linking.openURL(`${SITE}/support`)} />
        <Row icon="document-text-outline" title="Conditions d’utilisation" onPress={() => Linking.openURL(`${SITE}/cgu`)} />
        <Row icon="receipt-outline" title="Conditions de vente" onPress={() => Linking.openURL(`${SITE}/cgv`)} />
        <Row icon="shield-checkmark-outline" title="Confidentialité" onPress={() => Linking.openURL(`${SITE}/confidentialite`)} />
        <Row icon="business-outline" title="Mentions légales" onPress={() => Linking.openURL(`${SITE}/mentions-legales`)} last />
      </Group>

      <SectionTitle>Mes données</SectionTitle>
      <Group>
        <Row icon="download-outline" title="Exporter mes données" onPress={exportData} />
        <Row icon="log-out-outline" title="Me déconnecter" onPress={signOut} />
        <Row icon="trash-outline" title="Supprimer mon compte" onPress={deleteAccount} danger last />
      </Group>
      <Text size={11.5} color="muted" center>Connecté en tant que {user?.email}. Kalzo ne remplace pas l’avis d’un médecin ou d’un diététicien.</Text>
    </Screen>
  )
}
