import { useEffect, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { isPostedToday, loadReminders, registerPushToken, syncReminders, todayKey, type Reminders } from '@/lib/reminders'

// Garde les rappels locaux à jour (annulés quand le repas du jour est posté), enregistre le jeton push,
// et ouvre le bon écran quand on touche une notification.
export const reminderChanged = new EventTarget()

export function NotificationsSync() {
  const router = useRouter()
  const { dailyMeals, ready } = useData()
  const [reminders, setReminders] = useState<Reminders | null>(null)
  const today = dailyMeals[todayKey()]

  useEffect(() => {
    const reload = () => loadReminders().then(setReminders)
    reload()
    reminderChanged.addEventListener('change', reload)
    return () => reminderChanged.removeEventListener('change', reload)
  }, [])

  useEffect(() => {
    if (!ready || !reminders) return
    syncReminders(reminders, { dejeuner: isPostedToday(today, 'dejeuner'), diner: isPostedToday(today, 'diner') }).catch(() => {})
  }, [ready, reminders, today])

  useEffect(() => { if (ready) registerPushToken() }, [ready])

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(res => {
      const d = res.notification.request.content.data as { type?: string; slot?: string }
      if (d?.type === 'friend_request' || d?.type === 'friend_accepted') router.push('/friends')
      else if (d?.type === 'friend_meal') router.push('/feed')
      else if (d?.type === 'reminder') router.push({ pathname: '/capture', params: { mealType: d.slot } })
    })
    return () => sub.remove()
  }, [router])
  return null
}
