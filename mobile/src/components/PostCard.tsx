import { memo, useState } from 'react'
import { ActionSheetIOS, Alert, Platform, Pressable, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Avatar } from './Avatar'
import { Card } from './ui/kit'
import { Stars } from './ui/Stars'
import { Text } from './ui/Text'
import { PhotoViewer } from './PhotoViewer'
import { useTheme } from '@/theme'
import { usePhotoUrl } from '@/lib/usePhotoUrl'
import { REACTIONS, timeOf, type FeedPost } from '@/lib/social'
import { MEAL_TYPES } from '@/lib/logic/nutrition'
import * as haptics from '@/lib/haptics'

type Props = {
  post: FeedPost
  onReact: (post: FeedPost, emoji: string) => void
  onHide: (post: FeedPost) => void
  onReport: (post: FeedPost) => void
  onBlock: (post: FeedPost) => void
}

// Carte du feed : photo, note, protéines/glucides/lipides. JAMAIS de calories.
export const PostCard = memo(function PostCard({ post, onReact, onHide, onReport, onBlock }: Props) {
  const { colors } = useTheme()
  const router = useRouter()
  const url = usePhotoUrl(post.photo_path)
  const label = MEAL_TYPES.find(t => t.id === post.meal_type)?.label ?? 'Repas'
  const who = post.first_name || post.username
  const [viewer, setViewer] = useState(false)

  const menu = () => {
    haptics.tap()
    if (post.is_me) return
    const opts = ['Signaler', 'Masquer ce repas', `Bloquer @${post.username}`, 'Annuler']
    const run = (i: number) => { if (i === 0) onReport(post); if (i === 1) onHide(post); if (i === 2) onBlock(post) }
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: 3, destructiveButtonIndex: [0, 2] }, run)
    else Alert.alert('Ce repas', undefined, [{ text: 'Signaler', onPress: () => run(0) }, { text: 'Masquer ce repas', onPress: () => run(1) }, { text: `Bloquer @${post.username}`, onPress: () => run(2) }, { text: 'Annuler', style: 'cancel' }])
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Profil de ${who}`} onPress={() => router.push({ pathname: '/friend/[username]', params: { username: post.username } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Avatar name={who} username={post.username} />
          <View style={{ flex: 1 }}>
            <Text weight={700} numberOfLines={1}>{post.is_me ? 'Toi' : who} <Text size={13} color="muted">@{post.username}</Text></Text>
            <Text size={12.5} color="muted">{label} · {timeOf(post.consumed_at)}</Text>
          </View>
        </Pressable>
        {!post.is_me ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Plus d’actions" onPress={menu} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text size={22} weight={800} color="muted">⋯</Text>
          </Pressable>
        ) : null}
      </View>

      {post.photo_path ? (
        <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Photo : ${post.name}. Toucher pour agrandir`} accessibilityHint="Ouvre la photo en grand" onPress={() => { haptics.tap(); setViewer(true) }}
          style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.muted }}>
          {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} /> : null}
          <PhotoViewer path={post.photo_path} visible={viewer} onClose={() => setViewer(false)} label={`Photo : ${post.name}`} />
        </Pressable>
      ) : (
        <View style={{ height: 120, backgroundColor: colors.nutriSoft, alignItems: 'center', justifyContent: 'center' }}><Text size={52}>{post.emoji}</Text></View>
      )}

      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text size={17} weight={800} style={{ flex: 1 }} numberOfLines={2}>{post.name}</Text>
          {post.stars ? <Stars value={post.stars} size={18} /> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }} accessible accessibilityLabel={`Protéines ${Math.round(post.prot ?? 0)} g, glucides ${Math.round(post.gluc ?? 0)} g, lipides ${Math.round(post.lip ?? 0)} g`}>
          <Text size={13} weight={700} style={{ color: colors.prot }}>P {Math.round(post.prot ?? 0)} g</Text>
          <Text size={13} weight={700} style={{ color: colors.gluc }}>G {Math.round(post.gluc ?? 0)} g</Text>
          <Text size={13} weight={700} style={{ color: colors.lip }}>L {Math.round(post.lip ?? 0)} g</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {REACTIONS.map(e => {
            const active = post.my_reaction === e
            const n = post.reactions[e] ?? 0
            return (
              <Pressable key={e} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Réagir ${e}${n ? `, ${n}` : ''}`} onPress={() => { haptics.tap(); onReact(post, e) }}
                style={{ minHeight: 40, minWidth: 48, paddingHorizontal: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: active ? colors.nutriSoft : colors.muted, borderWidth: active ? 1.5 : 0, borderColor: colors.nutri }}>
                <Text size={17}>{e}</Text>
                {n ? <Text size={13} weight={700} tabular>{n}</Text> : null}
              </Pressable>
            )
          })}
          <Pressable accessibilityRole="button" accessibilityLabel={`Commentaires, ${post.comment_count}`} onPress={() => router.push({ pathname: '/comments/[id]', params: { id: post.id } })}
            style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.muted, marginLeft: 'auto' }}>
            <Text size={15}>💬</Text>
            <Text size={13} weight={700} tabular>{post.comment_count || ''}</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  )
})
