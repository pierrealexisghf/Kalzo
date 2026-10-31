import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text as RNText, View } from 'react-native'
import { Stack, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  useFonts, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, Geist_800ExtraBold,
} from '@expo-google-fonts/geist'
import { ThemeProvider, useTheme } from '@/theme'
import { ToastProvider } from '@/components/ui/Toast'
import { SessionProvider, useSession } from '@/state/session'
import { DataProvider, useData } from '@/state/data'
import { useAuthLinks } from '@/lib/deeplinks'
import { initPurchases, resetPurchases } from '@/lib/purchases'
import { NotificationsSync } from '@/components/NotificationsSync'

SplashScreen.preventAutoHideAsync()

// Filet de sécurité : une erreur JavaScript fatale n'éteint plus l'app, elle s'affiche avec son détail.
declare const ErrorUtils: { setGlobalHandler: (h: (e: unknown, isFatal?: boolean) => void) => void } | undefined
const errorListeners = new Set<(m: string) => void>()
let lastError: string | null = null
if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.setGlobalHandler((e, isFatal) => {
    const err = e as { message?: string; stack?: string } | undefined
    lastError = `${isFatal ? 'Erreur fatale' : 'Erreur'} : ${err?.message ?? String(e)}\n\n${(err?.stack ?? '').slice(0, 1500)}`
    errorListeners.forEach(l => l(lastError as string))
  })
}

function ErrorOverlay() {
  const [message, setMessage] = useState<string | null>(lastError)
  useEffect(() => {
    errorListeners.add(setMessage)
    return () => { errorListeners.delete(setMessage) }
  }, [])
  if (!message) return null
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#111', paddingTop: 70, paddingHorizontal: 16, paddingBottom: 40 }}>
      <RNText style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 10 }}>Une erreur est survenue</RNText>
      <ScrollView><RNText selectable style={{ color: '#ddd', fontSize: 12 }}>{message}</RNText></ScrollView>
      <Pressable onPress={() => { lastError = null; setMessage(null) }} style={{ marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: '#2f9e6b', alignItems: 'center' }}>
        <RNText style={{ color: '#fff', fontWeight: '700' }}>Fermer</RNText>
      </Pressable>
    </View>
  )
}

function Gate() {
  const { colors, isDark } = useTheme()
  const { session, loading, account, recovery } = useSession()
  const { ready, profile } = useData()
  useAuthLinks(() => {})
  const userId = session?.user.id
  // RevenueCat est identifié par l'identifiant Supabase : le webhook sait ainsi à quel profil rattacher l'achat.
  useEffect(() => {
    if (userId) initPurchases(userId).catch(() => {})
    else resetPurchases()
  }, [userId])

  // On attend que le compte ET les données soient chargés avant d'aiguiller (pas de flash d'écran).
  const resolving = loading || (!!session && (!account || !ready))
  useEffect(() => { if (!resolving) SplashScreen.hideAsync() }, [resolving])
  if (resolving) return null

  const needsUsername = !!session && !account?.username
  const needsProfile = !!session && !!account?.username && !profile

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {session && !needsUsername && !needsProfile ? <NotificationsSync /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!!session && recovery}>
          <Stack.Screen name="reset-password" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={needsUsername && !recovery}>
          <Stack.Screen name="(setup)/username" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={needsProfile && !recovery}>
          <Stack.Screen name="(setup)/welcome" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session && !needsUsername && !needsProfile && !recovery}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  )
}

// Les données sont rechargées à neuf à chaque changement de compte.
function KeyedData() {
  const { user } = useSession()
  return <DataProvider key={user?.id ?? 'anonyme'}><Gate /></DataProvider>
}

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, Geist_800ExtraBold })
  if (!loaded) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <SessionProvider>
              <KeyedData />
            </SessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      <ErrorOverlay />
    </GestureHandlerRootView>
  )
}
