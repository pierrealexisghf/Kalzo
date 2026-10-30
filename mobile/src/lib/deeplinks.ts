import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { supabase } from './supabase'

// Liens kalzo://auth-callback#access_token=…&refresh_token=…&type=signup|recovery
// (confirmation d'e-mail et réinitialisation du mot de passe). detectSessionInUrl est
// désactivé : on lit nous-mêmes le fragment de l'URL.
export const AUTH_REDIRECT = 'kalzo://auth-callback'

export async function handleAuthUrl(url: string | null): Promise<'signup' | 'recovery' | null> {
  if (!url || !url.startsWith('kalzo://auth-callback')) return null
  const raw = url.split('#')[1] ?? url.split('?')[1] ?? ''
  const params = new URLSearchParams(raw)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  const code = params.get('code')
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) return null
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return null
  } else return null
  return params.get('type') === 'recovery' ? 'recovery' : 'signup'
}

export function useAuthLinks(onRecovery: () => void) {
  useEffect(() => {
    const run = async (url: string | null) => { if ((await handleAuthUrl(url)) === 'recovery') onRecovery() }
    Linking.getInitialURL().then(run)
    const sub = Linking.addEventListener('url', e => run(e.url))
    return () => sub.remove()
  }, [onRecovery])
}
