import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from './supabase'
import { dateKey, todayKey } from './logic/dates'

// Rappels midi / soir : notifications LOCALES planifiées sur l'appareil (sans serveur).
export type Slot = 'dejeuner' | 'diner'
export type Reminders = { enabled: Record<Slot, boolean>; times: Record<Slot, string> }
export const DEFAULT_REMINDERS: Reminders = { enabled: { dejeuner: false, diner: false }, times: { dejeuner: '12:30', diner: '19:30' } }
const KEY = 'kalzo.reminders'
const PREFIX = 'kalzo-reminder-'
const DAYS_AHEAD = 7

export const SLOT_LABEL: Record<Slot, string> = { dejeuner: 'déjeuner', diner: 'dîner' }

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
})

export async function loadReminders(): Promise<Reminders> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? { ...DEFAULT_REMINDERS, ...JSON.parse(raw) } : DEFAULT_REMINDERS
  } catch { return DEFAULT_REMINDERS }
}
export async function saveReminders(r: Reminders) { await AsyncStorage.setItem(KEY, JSON.stringify(r)).catch(() => {}) }

export async function permissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const p = await Notifications.getPermissionsAsync()
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied'
}
export async function requestPermission(): Promise<boolean> {
  const p = await Notifications.requestPermissionsAsync()
  if (Platform.OS === 'android') {
    // eslint-disable-next-line import/namespace
    await Notifications.setNotificationChannelAsync('default', { name: 'Kalzo', importance: Notifications.AndroidImportance.DEFAULT })
  }
  return p.granted
}

/**
 * Replanifie les 7 prochains jours. Si le repas du créneau est déjà posté aujourd'hui,
 * la notification du jour n'est pas planifiée (c'est ainsi qu'elle est « annulée »).
 */
export async function syncReminders(r: Reminders, postedToday: Record<Slot, boolean>) {
  const all = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(all.filter(n => n.identifier.startsWith(PREFIX)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)))
  if (!(await Notifications.getPermissionsAsync()).granted) return
  const now = new Date()
  for (const slot of ['dejeuner', 'diner'] as Slot[]) {
    if (!r.enabled[slot]) continue
    const [h, m] = r.times[slot].split(':').map(Number)
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0)
      if (when <= now) continue
      if (i === 0 && postedToday[slot]) continue
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${slot}-${dateKey(when)}`,
        content: {
          title: slot === 'dejeuner' ? 'C’est l’heure du déjeuner 🍽️' : 'C’est l’heure du dîner 🌙',
          body: 'Prends ton assiette en photo et partage-la avec tes amis.',
          data: { type: 'reminder', slot },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      })
    }
  }
}
export const isPostedToday = (meals: { mealType: string | null }[] | undefined, slot: Slot) => !!meals?.some(m => m.mealType === slot)
export { todayKey }

/** Enregistre le jeton Expo Push (notifications sociales : demande d'ami, ami qui poste). */
export async function registerPushToken(): Promise<boolean> {
  if (!(await Notifications.getPermissionsAsync()).granted) return false
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId || Constants.easConfig?.projectId
  if (!projectId) return false
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS === 'ios' ? 'ios' : 'android' })
    return !error
  } catch { return false }
}
export async function unregisterPushToken() {
  try {
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId || Constants.easConfig?.projectId
    if (!projectId) return
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await supabase.rpc('unregister_push_token', { p_token: token })
  } catch { /* hors ligne ou jeton absent */ }
}
