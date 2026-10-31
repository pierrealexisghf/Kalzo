import { Pressable, Text, View } from 'react-native'
import { Redirect, useRouter, type Href } from 'expo-router'
import { useSession } from '@/state/session'
import { useData } from '@/state/data'
import Welcome from './(setup)/welcome'

// Point d'entrée « / » : aiguille vers le bon groupe selon l'état du compte.
// L'écran de bienvenue est affiché directement ici : l'ouvrir comme page séparée fermait l'app sur iPhone.
export default function Index() {
  const router = useRouter()
  const { session, account, recovery } = useSession()
  const { profile } = useData()
  if (session && account?.username && !profile && !recovery) return <Welcome />

  let href: Href = '/login'
  if (session && recovery) href = '/reset-password'
  else if (session && !account?.username) href = '/username'
  else if (session) href = '/feed'

  // TEMPORAIRE (diagnostic) : compte complet → écran de contrôle avant d'ouvrir le feed.
  if (session && !recovery && account?.username && profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', padding: 24, gap: 14 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Kalzo : profil enregistré</Text>
        <Pressable onPress={() => router.replace(href)} style={{ padding: 16, borderRadius: 12, backgroundColor: '#2f9e6b', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Ouvrir le feed</Text>
        </Pressable>
      </View>
    )
  }
  return <Redirect href={href} />
}
