import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { prepareAvatar } from './photos'

// Photos de profil : bucket public « avatars » (<id utilisateur>/<horodatage>.jpg). Les pseudos des autres
// sont résolus par lots (une seule requête pour tout un feed) puis gardés en mémoire.
const BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/avatars/`
const cache = new Map<string, string | null>()
const pending = new Set<string>()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | null = null

const key = (u: string) => u.trim().toLowerCase()
const notify = () => listeners.forEach(l => l())

function schedule(username: string) {
  const k = key(username)
  if (cache.has(k) || pending.has(k)) return
  pending.add(k)
  if (timer) return
  timer = setTimeout(async () => {
    timer = null
    const batch = [...pending].slice(0, 100)
    batch.forEach(b => pending.delete(b))
    const { data, error } = await supabase.rpc('avatars_for', { p_usernames: batch })
    if (error) { batch.forEach(b => cache.set(b, null)); notify(); return }
    const found = new Map((data as { username: string; avatar_path: string }[]).map(r => [key(r.username), r.avatar_path]))
    batch.forEach(b => cache.set(b, found.get(b) ?? null))
    notify()
    if (pending.size) { const next = [...pending][0]; pending.delete(next); schedule(next) }
  }, 60)
}

/** URL de la photo de profil d'un pseudo (null tant qu'elle n'est pas connue ou s'il n'y en a pas). */
export function useAvatarUrl(username?: string | null): string | null {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force(x => x + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  if (!username) return null
  schedule(username)
  const path = cache.get(key(username))
  return path ? BASE + path : null
}

/** Envoie la nouvelle photo, l'enregistre sur le profil et supprime les anciennes. */
export async function setMyAvatar(userId: string, username: string, localUri: string) {
  const img = await prepareAvatar(localUri)
  const path = `${userId}/${Date.now()}.jpg`
  const body = await (await fetch(img.uri)).arrayBuffer()
  const up = await supabase.storage.from('avatars').upload(path, body, { contentType: 'image/jpeg', upsert: false })
  if (up.error) throw up.error
  const { error } = await supabase.rpc('set_avatar', { p_path: path })
  if (error) { await supabase.storage.from('avatars').remove([path]).catch(() => {}); throw error }
  cache.set(key(username), path); notify()
  const old = await supabase.storage.from('avatars').list(userId)
  const stale = (old.data ?? []).map(f => `${userId}/${f.name}`).filter(p => p !== path)
  if (stale.length) supabase.storage.from('avatars').remove(stale).catch(() => {})
}

export async function removeMyAvatar(userId: string, username: string) {
  const { error } = await supabase.rpc('set_avatar', { p_path: null })
  if (error) throw error
  cache.set(key(username), null); notify()
  const old = await supabase.storage.from('avatars').list(userId)
  const all = (old.data ?? []).map(f => `${userId}/${f.name}`)
  if (all.length) supabase.storage.from('avatars').remove(all).catch(() => {})
}
