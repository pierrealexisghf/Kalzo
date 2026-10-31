import { useState } from 'react'
import { View } from 'react-native'
import { Image } from 'expo-image'
import { Text } from './ui/Text'
import { useTheme } from '@/theme'
import { initialOf } from '@/lib/social'
import { useAvatarUrl } from '@/lib/avatars'

// Photo de profil si elle existe (passer `username`), sinon l'initiale.
export function Avatar({ name, username, size = 40 }: { name?: string | null; username?: string | null; size?: number }) {
  const { colors } = useTheme()
  const url = useAvatarUrl(username)
  const [failed, setFailed] = useState<string | null>(null)
  const box = { width: size, height: size, borderRadius: size / 2 }
  if (url && failed !== url) {
    return <Image accessibilityElementsHidden source={{ uri: url }} style={[box, { backgroundColor: colors.muted }]} contentFit="cover" onError={() => setFailed(url)} />
  }
  return (
    <View accessibilityElementsHidden style={{ ...box, backgroundColor: colors.nutriSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text size={size * 0.45} weight={800} color="nutri">{initialOf(name)}</Text>
    </View>
  )
}
