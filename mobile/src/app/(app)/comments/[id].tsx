import { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Avatar } from '@/components/Avatar'
import { EmptyState, Input, Skeleton } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/theme'
import { addComment, deleteComment, listComments, reportMeal, type Comment } from '@/lib/social'
import * as haptics from '@/lib/haptics'

export default function Comments() {
  const { colors } = useTheme()
  const toast = useToast()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [items, setItems] = useState<Comment[] | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try { setItems(await listComments(id)) } catch (e) { toast.show((e as Error).message, 'error'); setItems([]) }
  }, [id, toast])
  useEffect(() => { Promise.resolve().then(load) }, [load])

  const send = async () => {
    const body = text.trim()
    if (!body) return
    setSending(true)
    try { await addComment(id, body); haptics.success(); setText(''); await load() } catch (e) { toast.show((e as Error).message, 'error') }
    setSending(false)
  }
  const actions = (c: Comment) => {
    if (c.can_delete) Alert.alert('Supprimer ce commentaire ?', undefined, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteComment(c.id).catch(() => {}); load() } }])
    else Alert.alert('Signaler ce commentaire ?', undefined, [{ text: 'Annuler', style: 'cancel' }, { text: 'Signaler', style: 'destructive', onPress: async () => { await reportMeal(id, 'inappropriate', c.id).catch(() => {}); toast.show('Signalement envoyé', 'success') } }])
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ padding: 16, paddingBottom: 8 }}><Text size={20} weight={800}>Commentaires</Text></View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {items === null ? <><Skeleton height={44} /><Skeleton height={44} /></> : items.length === 0 ? <EmptyState emoji="💬" title="Pas encore de commentaire" text="Sois le premier à réagir." /> : items.map(c => (
          <Pressable key={c.id} accessibilityRole="button" accessibilityHint={c.can_delete ? 'Appui long pour supprimer' : 'Appui long pour signaler'} onLongPress={() => actions(c)} style={{ flexDirection: 'row', gap: 10 }}>
            <Avatar name={c.first_name || c.username} username={c.username} size={34} />
            <View style={{ flex: 1 }}>
              <Text size={13} weight={700}>{c.is_me ? 'Toi' : c.first_name || c.username} <Text size={12} color="muted">@{c.username}</Text></Text>
              <Text size={15}>{c.body}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}>
        <Input value={text} onChangeText={setText} placeholder="Ajouter un commentaire…" maxLength={200} style={{ flex: 1 }} returnKeyType="send" onSubmitEditing={send} />
        <Pressable accessibilityRole="button" accessibilityLabel="Envoyer" disabled={sending || !text.trim()} onPress={send} style={{ minWidth: 64, height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: sending || !text.trim() ? 0.5 : 1 }}>
          <Text weight={700} style={{ color: colors.primaryFg }}>Envoyer</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
