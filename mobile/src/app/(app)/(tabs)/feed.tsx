import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, RefreshControl, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useIsFocused, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useData } from '@/state/data'
import { resetDraft } from '@/state/draft'
import { Button, Card, EmptyState, Skeleton } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { PostCard } from '@/components/PostCard'
import { TAB_BAR_HEIGHT } from '@/components/FloatingTabBar'
import { useTheme } from '@/theme'
import { blockUser, feedPage, hideMeal, overview, react, reportMeal, type FeedPost } from '@/lib/social'
import { addDays, cardSlot, localTimestamp, todayKey } from '@/lib/logic/dates'
import { DEFAULT_REMINDERS, loadReminders } from '@/lib/reminders'
import * as haptics from '@/lib/haptics'

const PAGE = 12

export default function Feed() {
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const focused = useIsFocused()
  const { dailyMeals } = useData()
  const [times, setTimes] = useState(DEFAULT_REMINDERS.times)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!focused) return
    loadReminders().then(r => setTimes(r.times))
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [focused])
  const [posts, setPosts] = useState<FeedPost[] | null>(null)
  const [done, setDone] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pending, setPending] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async (reset: boolean, current: FeedPost[] = []) => {
    try {
      const last = reset ? undefined : current[current.length - 1]
      const page = await feedPage(last ? { at: last.consumed_at, id: last.id } : undefined, PAGE)
      setPosts(reset ? page : [...current, ...page])
      setDone(page.length < PAGE)
    } catch (e) { toast.show((e as Error).message, 'error'); setPosts(p => p ?? []) }
  }, [toast])

  // Rafraîchit à chaque retour sur l'onglet (nouveau repas publié, nouvel ami…).
  useEffect(() => {
    if (!focused) return
    let alive = true
    Promise.resolve().then(() => load(true))
    overview().then(o => { if (alive) setPending(o.incoming.length) }).catch(() => {})
    return () => { alive = false }
  }, [focused, load])

  const onRefresh = async () => { setRefreshing(true); await load(true); setRefreshing(false) }
  const more = async () => {
    if (done || loadingMore || !posts?.length) return
    setLoadingMore(true); await load(false, posts); setLoadingMore(false)
  }

  const onReact = useCallback(async (post: FeedPost, emoji: string) => {
    // Mise à jour immédiate, puis confirmation du serveur.
    const apply = (p: FeedPost): FeedPost => {
      const r = { ...p.reactions }
      if (p.my_reaction) { r[p.my_reaction] = Math.max(0, (r[p.my_reaction] ?? 1) - 1); if (!r[p.my_reaction]) delete r[p.my_reaction] }
      const mine = p.my_reaction === emoji ? null : emoji
      if (mine) r[mine] = (r[mine] ?? 0) + 1
      return { ...p, reactions: r, my_reaction: mine }
    }
    setPosts(ps => ps && ps.map(p => (p.id === post.id ? apply(p) : p)))
    try { await react(post.id, emoji) } catch (e) { toast.show((e as Error).message, 'error'); load(true) }
  }, [load, toast])

  const onHide = useCallback(async (post: FeedPost) => {
    setPosts(ps => ps && ps.filter(p => p.id !== post.id))
    try { await hideMeal(post.id); toast.show('Repas masqué') } catch (e) { toast.show((e as Error).message, 'error') }
  }, [toast])
  const onReport = useCallback(async (post: FeedPost) => {
    try { await reportMeal(post.id, 'inappropriate'); setPosts(ps => ps && ps.filter(p => p.id !== post.id)); toast.show('Merci, le signalement a été envoyé. Le repas est masqué.', 'success') }
    catch (e) { toast.show((e as Error).message, 'error') }
  }, [toast])

  const onBlock = useCallback((post: FeedPost) => Alert.alert(`Bloquer @${post.username} ?`, 'Vous ne verrez plus les repas ni les commentaires l’un de l’autre. Vous pouvez débloquer depuis « Mes amis ».', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Bloquer', style: 'destructive', onPress: async () => {
      try { await blockUser(post.username); setPosts(ps => ps && ps.filter(p => p.username !== post.username)); toast.show(`@${post.username} est bloqué.`, 'success') }
      catch (e) { toast.show((e as Error).message, 'error') }
    } },
  ]), [toast])

  // Carte « Tu n'as pas encore posté ton déjeuner / dîner » : ouvre directement la caméra.
  const slotInfo = cardSlot(now, times.dejeuner, times.diner)
  const slot = slotInfo.slot
  const cardDay = dailyMeals[slotInfo.yesterday ? addDays(todayKey(), -1) : todayKey()] || []
  // Le repas du créneau est « posté » s'il est partagé et soit de ce type, soit publié depuis l'heure du rappel.
  const [hh, mm] = (slot === 'diner' ? times.diner : times.dejeuner).split(':').map(Number)
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (slotInfo.yesterday ? 1 : 0), hh, mm)
  const since = localTimestamp(windowStart)
  const posted = cardDay.some(m => m.shared && (m.mealType === slot || (m.time ?? '') >= since))
  const slotLabel = slot === 'dejeuner' ? 'déjeuner' : 'dîner'

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text size={30} weight={800} accessibilityRole="header" style={{ letterSpacing: -0.6 }}>Feed</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Trouver des amis${pending ? `, ${pending} demande${pending > 1 ? 's' : ''} en attente` : ''}`} onPress={() => router.push('/friends')}
          style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text color="white" weight={700} size={14} style={{ color: colors.primaryFg }}>👋 Trouver des amis</Text>
          {pending ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Text size={12} weight={800} color="white">{pending}</Text></View> : null}
        </Pressable>
      </View>
      {slot && !posted ? (
        <Card tone="coach" onPress={() => { resetDraft(); haptics.tap(); router.push({ pathname: '/capture', params: { mealType: slot } }) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel={`Tu n’as pas encore posté ton ${slotLabel}. Ouvrir l’appareil photo.`}>
          <Text size={32}>📸</Text>
          <View style={{ flex: 1 }}><Text weight={800} size={16}>Tu n’as pas encore posté ton {slotLabel}</Text><Text size={13} color="muted">Touche pour prendre ton assiette en photo</Text></View>
        </Card>
      ) : null}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      {posts === null ? (
        <View style={{ padding: 16, gap: 16 }}>{header}<Skeleton height={420} radius={28} /><Skeleton height={420} radius={28} /></View>
      ) : (
        <FlashList
          data={posts}
          keyExtractor={p => p.id}
          renderItem={({ item }) => <View style={{ paddingBottom: 14 }}><PostCard post={item} onReact={onReact} onHide={onHide} onReport={onReport} onBlock={onBlock} /></View>}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState emoji="🍽️" title="Le feed est vide pour l’instant" text="Poste ton repas, ou ajoute des amis pour voir ce qu’ils mangent. Les repas restent 48 h dans le fil." action={<Button label="Trouver des amis" onPress={() => router.push('/friends')} />} />}
          ListFooterComponent={loadingMore ? <Skeleton height={80} radius={24} /> : null}
          onEndReached={more}
          onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_BAR_HEIGHT + 48 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}
