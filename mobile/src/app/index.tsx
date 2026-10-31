import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Redirect, useRouter, type Href } from 'expo-router'
import { useSession } from '@/state/session'
import { useData } from '@/state/data'

// TEMPORAIRE (diagnostic du plantage au lancement) : écran de contrôle avant d'ouvrir l'écran réel.
const DIAG = true

// Point d'entrée « / » : aiguille vers le bon groupe selon l'état du compte.
export default function Index() {
  const router = useRouter()
  const { session, account, recovery } = useSession()
  const { profile } = useData()
  const [log, setLog] = useState<string[]>([])
  const test = (name: string, fn: () => unknown) => {
    setLog(l => [...l, `${name} : en cours…`])
    try { fn(); setLog(l => [...l.slice(0, -1), `${name} : OK`]) } catch (e) { setLog(l => [...l.slice(0, -1), `${name} : ERREUR ${(e as Error).message}`]) }
  }
  let href: Href = '/login'
  if (session && recovery) href = '/reset-password'
  else if (session && !account?.username) href = '/username'
  else if (session && !profile) href = '/welcome'
  else if (session) href = '/feed'
  if (!DIAG) return <Redirect href={href} />
  return (
    <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', padding: 24, gap: 14 }}>
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Kalzo : écran de contrôle</Text>
      <Text style={{ color: '#ddd' }}>Connecté : {session ? 'oui' : 'non'}</Text>
      <Text style={{ color: '#ddd' }}>Pseudo : {account?.username ?? 'aucun'}</Text>
      <Text style={{ color: '#ddd' }}>Profil nutrition : {profile ? 'oui' : 'non'}</Text>
      <Text style={{ color: '#ddd' }}>Destination normale : {String(href)}</Text>
      {[
        ['1 Importer Ring', () => require('@/components/ui/Ring')],
        ['2 Importer kit', () => require('@/components/ui/kit')],
        ['3 Importer calculs', () => require('@/lib/logic/nutrition')],
        ['4 Importer bienvenue', () => require('./(setup)/welcome')],
      ].map(([n, f]) => (
        <Pressable key={n as string} onPress={() => test(n as string, f as () => unknown)} style={{ padding: 12, borderRadius: 12, backgroundColor: '#333', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{n as string}</Text>
        </Pressable>
      ))}
      {log.map((l, i) => <Text key={i} style={{ color: '#9f9' }}>{l}</Text>)}
      <Pressable onPress={() => router.replace(href)} style={{ padding: 16, borderRadius: 12, backgroundColor: '#2f9e6b', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Ouvrir l’écran réel</Text>
      </Pressable>
    </View>
  )
}
