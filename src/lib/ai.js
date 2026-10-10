import { supabase } from './supabase'

export async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

// Appel IA authentifié. Le serveur identifie l'utilisateur, débite le crédit
// et plafonne la taille de la demande. Retourne une Response comme fetch().
// Les écrans écoutent l'événement "kalzo:ai" pour mettre à jour les crédits
// et afficher les messages d'erreur (plus de crédits, limite du jour…).
export async function aiFetch(init = {}) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: await authHeaders(),
    body: init.body,
  })
  let detail = {}
  if (res.ok) {
    const balance = res.headers.get('x-credits-balance')
    detail = { balance: balance && balance !== 'unlimited' ? Number(balance) : null }
  } else {
    const data = await res.clone().json().catch(() => ({}))
    detail = { error: data?.error?.message || "L'IA est indisponible pour le moment.", code: data?.error?.code }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kalzo:ai', { detail }))
  }
  return res
}
