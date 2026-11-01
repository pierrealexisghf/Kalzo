import { Modal, Pressable, ScrollView, StatusBar, useWindowDimensions, View } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from './ui/Text'
import { Glass } from './ui/Glass'
import { usePhotoUrl } from '@/lib/usePhotoUrl'

// Visionneuse plein écran : photo entière (non rognée), zoom au pincement, fermeture par la croix ou en tirant vers le bas.
export function PhotoViewer({ path, visible, onClose, label }: { path?: string | null; visible: boolean; onClose: () => void; label?: string }) {
  const url = usePhotoUrl(visible ? path : null)
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ width, height, alignItems: 'center', justifyContent: 'center' }}
          minimumZoomScale={1} maximumZoomScale={4} bouncesZoom centerContent showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
          {url ? <Image source={{ uri: url }} accessibilityLabel={label ?? 'Photo du repas'} style={{ width, height }} contentFit="contain" transition={150} /> : null}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer la photo" onPress={onClose} hitSlop={10}
          style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
          <Glass clear interactive style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }} fallbackStyle={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
            <Text size={20} weight={700} color="white">✕</Text>
          </Glass>
        </Pressable>
      </View>
    </Modal>
  )
}
