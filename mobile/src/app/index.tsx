import { Redirect, type Href } from 'expo-router'
import { useSession } from '@/state/session'
import { useData } from '@/state/data'
import Welcome from './(setup)/welcome'

// Point d'entrée « / » : aiguille vers le bon groupe selon l'état du compte.
// Sans cette route, le basculement des gardes (connexion, pseudo, profil) laissait l'URL « / » sans écran.
// L'écran de bienvenue est affiché directement ici (pas de navigation vers une page protégée).
export default function Index() {
  const { session, account, recovery } = useSession()
  const { profile } = useData()
  if (session && account?.username && !profile && !recovery) return <Welcome />
  let href: Href = '/login'
  if (session && recovery) href = '/reset-password'
  else if (session && !account?.username) href = '/username'
  else if (session) href = '/feed'
  return <Redirect href={href} />
}
