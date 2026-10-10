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
// L'événement "kalzo:ai" met à jour les crédits affichés et les messages d'erreur.
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

// Le modèle ajoute parfois du texte ou des ``` autour du JSON : on isole l'objet.
export function parseAiJson(text) {
  const raw = String(text || '')
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('Réponse illisible')
  return JSON.parse(raw.slice(start, end + 1))
}

// Interroge l'IA et renvoie l'objet JSON demandé.
// Les erreurs "serveur" (plus de crédits, limite du jour…) sont déjà affichées
// par l'événement kalzo:ai : l'erreur lancée porte alors `handled = true`.
export async function askAI(content, maxTokens = 1000) {
  const res = await aiFetch({
    body: JSON.stringify({ max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) {
    const err = new Error('ai_error')
    err.handled = true
    throw err
  }
  const data = await res.json()
  return parseAiJson(data.content?.[0]?.text)
}

// Réduit une photo (côté long 1280 px, JPEG) : une photo de téléphone dépasse
// facilement la limite d'envoi de 4,5 Mo des fonctions Vercel.
export function compressImage(file, maxSide = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ dataUrl, base64: dataUrl.split(',')[1] })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')) }
    img.src = url
  })
}
