import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { supabase } from './supabase'

export const PHOTO_BUCKET = 'meal-photos'
const MAX_SIDE = 1080
const THUMB_SIDE = 400
const TARGET_BYTES = 250 * 1024

export type PreparedImage = { uri: string; base64: string; bytes: number; width: number; height: number }

async function render(uri: string, side: number, qualities: number[], maxBytes: number): Promise<PreparedImage> {
  const ref = await ImageManipulator.manipulate(uri).renderAsync()
  const scaled = Math.max(ref.width, ref.height) > side
    ? await ImageManipulator.manipulate(uri).resize(ref.width >= ref.height ? { width: side } : { height: side }).renderAsync()
    : ref
  let last!: PreparedImage
  for (const q of qualities) {
    // Un ré-encodage en JPEG supprime au passage l'EXIF et la géolocalisation.
    const out = await scaled.saveAsync({ format: SaveFormat.JPEG, compress: q, base64: true })
    last = { uri: out.uri, base64: out.base64 ?? '', bytes: Math.floor(((out.base64 ?? '').length * 3) / 4), width: out.width, height: out.height }
    if (last.bytes <= maxBytes) break
  }
  return last
}

/** Photo du repas : 1080 px max, JPEG ~0,7, ≤ 250 Ko (on baisse la qualité si besoin). */
export const prepareMealPhoto = (uri: string) => render(uri, MAX_SIDE, [0.7, 0.6, 0.5, 0.4, 0.3], TARGET_BYTES)
/** Photo de profil : carré 384 px max, JPEG ≤ 100 Ko. */
export const prepareAvatar = (uri: string) => render(uri, 384, [0.7, 0.55, 0.4, 0.3], 100 * 1024)
/** Miniature pour les grilles et le feed. */
export const prepareThumb = (uri: string) => render(uri, THUMB_SIDE, [0.6, 0.45], 60 * 1024)

async function upload(path: string, localUri: string) {
  const body = await (await fetch(localUri)).arrayBuffer()
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
}

/** Envoie la photo + sa miniature dans le dossier de l'utilisateur. */
export async function uploadMealPhotos(userId: string, photo: PreparedImage, thumb: PreparedImage) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const photoPath = `${userId}/${id}.jpg`
  const thumbPath = `${userId}/${id}_t.jpg`
  await upload(photoPath, photo.uri)
  try { await upload(thumbPath, thumb.uri) } catch (e) {
    await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]).catch(() => {})
    throw e
  }
  return { photoPath, thumbPath }
}

export async function removePhotos(paths: (string | null | undefined)[]) {
  const list = paths.filter(Boolean) as string[]
  if (list.length) await supabase.storage.from(PHOTO_BUCKET).remove(list)
}

// ---- URL signées (1 h) avec cache mémoire, partagées entre tous les écrans.
const cache = new Map<string, { url: string; exp: number }>()
const inflight = new Map<string, Promise<string | null>>()

export async function signedUrl(path: string): Promise<string | null> {
  const hit = cache.get(path)
  if (hit && hit.exp > Date.now() + 60_000) return hit.url
  if (inflight.has(path)) return inflight.get(path)!
  const p = (async () => {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600)
    if (error || !data?.signedUrl) return null
    cache.set(path, { url: data.signedUrl, exp: Date.now() + 3600_000 })
    return data.signedUrl
  })().finally(() => inflight.delete(path))
  inflight.set(path, p)
  return p
}
