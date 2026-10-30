import { useEffect } from 'react'
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

SplashScreen.preventAutoHideAsync()

function Gate() {
  const { colors, isDark } = useTheme()
  const { session, loading, account, recovery } = useSession()
  const { ready, profile } = useData()
  useAuthLinks(() => {})

  // On attend que le compte ET les données soient chargés avant d'aiguiller (pas de flash d'écran).
  const resolving = loading || (!!session && (!account || !ready))
  useEffect(() => { if (!resolving) SplashScreen.hideAsync() }, [resolving])
  if (resolving) return null

  const needsUsername = !!session && !account?.username
  const needsProfile = !!session && !!account?.username && !profile

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
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
    </GestureHandlerRootView>
  )
}
