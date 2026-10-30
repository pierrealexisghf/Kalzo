import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { Text } from './ui/Text'
import { useTheme } from '@/theme'
import { usePhotoUrl } from '@/lib/usePhotoUrl'

// Une photo a expiré quand sa date est passée, ou qu'elle a déjà été supprimée (date conservée, chemin vidé).
export function photoGone(m: { photoPath?: string | null; photoExpiresAt?: string | null }): boolean {
  if (!m.photoExpiresAt) return false
  return !m.photoPath || new Date(m.photoExpiresAt).getTime() <= Date.now()
}

// Photo du repas (URL signée), ou à défaut l'emoji. `thumb` pour les grilles et le feed.
export function MealPhoto({ path, emoji, size, style, radius = 16, label }: {
  path?: string | null; emoji?: string; size?: number; style?: StyleProp<ViewStyle>; radius?: number; label?: string
}) {
  const { colors } = useTheme()
  const url = usePhotoUrl(path)
  const box: ViewStyle = size ? { width: size, height: size } : { width: '100%', aspectRatio: 1 }
  return (
    <View style={[box, { borderRadius: radius, overflow: 'hidden', backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }, style]}>
      {url ? <Image source={{ uri: url }} accessibilityLabel={label ?? 'Photo du repas'} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} /> : (
        path ? null : <Text size={size ? size * 0.45 : 40}>{emoji ?? '🍽️'}</Text>
      )}
    </View>
  )
}
