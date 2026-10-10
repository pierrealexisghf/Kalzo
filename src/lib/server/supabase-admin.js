import { createClient } from '@supabase/supabase-js'

// Client "service_role" : contourne la RLS. À n'utiliser QUE côté serveur,
// jamais dans un composant client, et jamais avec un identifiant venu du navigateur.
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// Identifie l'appelant à partir du jeton de session (en-tête Authorization).
// Retourne l'utilisateur, ou null si le jeton est absent / invalide / expiré.
export async function requireUser(request) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const { data, error } = await adminClient().auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

export function jsonError(message, status, code) {
  return Response.json({ error: { message, code } }, { status })
}
