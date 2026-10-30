import { useRef, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native'
import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { setDraft } from '@/state/draft'
import { prepareMealPhoto, prepareThumb } from '@/lib/photos'
import * as haptics from '@/lib/haptics'

export default function Capture() {
  const router = useRouter()
  const toast = useToast()
  const insets = useSafeAreaInsets()
  const { mealType, day } = useLocalSearchParams<{ mealType?: string; day?: string }>()
  const cam = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [flash, setFlash] = useState<FlashMode>('off')
  const [busy, setBusy] = useState(false)

  const proceed = async (uri: string) => {
    setBusy(true)
    try {
      const [full, thumb] = await Promise.all([prepareMealPhoto(uri), prepareThumb(uri)])
      setDraft({ photo: { full, thumb }, prefill: null })
      router.replace({ pathname: '/meal-validate', params: { mode: 'scan', mealType, day } })
    } catch {
      toast.show('Impossible de traiter cette photo, réessaie.', 'error')
      setBusy(false)
    }
  }

  const shoot = async () => {
    if (busy || !cam.current) return
    haptics.tap()
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.9, skipProcessing: false })
      await proceed(pic.uri)
    } catch { toast.show('La photo a échoué, réessaie.', 'error') }
  }

  const gallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false })
    if (!res.canceled && res.assets[0]) await proceed(res.assets[0].uri)
  }

  // Demande de permission au bon moment : au premier scan, avec une explication claire.
  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1410', padding: 28, justifyContent: 'center', gap: 14 }}>
        <Text size={56} center>📸</Text>
        <Text size={24} weight={800} center color="white">Autorise l’appareil photo</Text>
        <Text center style={{ color: '#b8c7bf' }}>Kalzo l’utilise uniquement pour photographier tes repas. Tes photos restent privées et ne sont partagées qu’avec les amis que tu choisis.</Text>
        <Button label={permission.canAskAgain ? 'Autoriser' : 'Ouvrir les réglages'} size="lg"
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())} />
        <Button label="Choisir dans ma photothèque" variant="outline" onPress={gallery} />
        <Button label="Annuler" variant="ghost" onPress={() => router.back()} />
      </View>
    )
  }

  const round = (name: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, active = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { haptics.select(); onPress() }}
      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: active ? '#fff' : 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={24} color={active ? '#000' : '#fff'} />
    </Pressable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />
      <View style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
        {round('close', 'Fermer', () => router.back())}
        {round(flash === 'on' ? 'flash' : 'flash-off', flash === 'on' ? 'Désactiver le flash' : 'Activer le flash', () => setFlash(f => (f === 'on' ? 'off' : 'on')), flash === 'on')}
      </View>
      <View style={{ position: 'absolute', bottom: insets.bottom + 28, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        {round('images', 'Choisir dans la photothèque', gallery)}
        <Pressable accessibilityRole="button" accessibilityLabel="Prendre la photo" onPress={shoot} disabled={busy}
          style={({ pressed }) => ({ width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          {busy ? <ActivityIndicator color="#fff" /> : <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' }} />}
        </Pressable>
        {round('camera-reverse', 'Retourner la caméra', () => setFacing(f => (f === 'back' ? 'front' : 'back')))}
      </View>
    </View>
  )
}
