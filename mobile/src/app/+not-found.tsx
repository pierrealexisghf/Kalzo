import { Redirect } from 'expo-router'

// Liens entrants sans écran (ex. kalzo://auth-callback) : la session est traitée par deeplinks.ts, on revient à l'aiguillage.
export default function NotFound() {
  return <Redirect href="/" />
}
