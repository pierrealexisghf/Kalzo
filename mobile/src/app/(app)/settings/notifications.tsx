import { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, Switch, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/state/session'
import { reminderChanged } from '@/components/NotificationsSync'
import { Card, Header, Screen, SectionTitle } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/theme'
import {
  DEFAULT_REMINDERS, SLOT_LABEL, loadReminders, permissionStatus, registerPushToken, requestPermission, saveReminders, type Reminders, type Slot,
} from '@/lib/reminders'
import * as haptics from '@/lib/haptics'

const step = (time: string, delta: number) => {
  const [h, m] = time.split(':').map(Number)
  const t = (h * 60 + m + delta + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export default function NotificationsSettings() {
  const { colors } = useTheme()
  const toast = useToast()
  const { user } = useSession()
  const [r, setR] = useState<Reminders>(DEFAULT_REMINDERS)
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined'>('undetermined')
  const [social, setSocial] = useState({ notif_friend_requests: true, notif_friend_meals: true })

  useEffect(() => {
    loadReminders().then(setR)
    permissionStatus().then(setPerm)
    if (user) supabase.from('profiles').select('notif_friend_requests, notif_friend_meals').eq('id', user.id).maybeSingle().then(({ data }) => { if (data) setSocial(data) })
  }, [user])

  const persist = useCallback(async (next: Reminders) => { setR(next); await saveReminders(next); reminderChanged.dispatchEvent(new Event('change')) }, [])

  // Permission demandée au bon moment : quand l'utilisateur active un rappel ou une notification.
  const ensurePermission = async () => {
    if (perm === 'granted') return true
    if (perm === 'denied') { toast.show('Active les notifications dans les réglages de ton téléphone.', 'error'); Linking.openSettings(); return false }
    const ok = await requestPermission()
    setPerm(ok ? 'granted' : 'denied')
    if (ok) registerPushToken()
    return ok
  }

  const toggleReminder = async (slot: Slot, on: boolean) => {
    if (on && !(await ensurePermission())) return
    haptics.select()
    persist({ ...r, enabled: { ...r.enabled, [slot]: on } })
  }
  const toggleSocial = async (key: 'notif_friend_requests' | 'notif_friend_meals', on: boolean) => {
    if (on && !(await ensurePermission())) return
    haptics.select()
    setSocial(s => ({ ...s, [key]: on }))
    const { error } = await supabase.from('profiles').update({ [key]: on }).eq('id', user!.id)
    if (error) toast.show('Réglage non enregistré.', 'error')
  }

  return (
    <Screen>
      <Header title="Notifications" subtitle="Rappels et activité de tes amis" onBack />
      {perm !== 'granted' ? <Card tone="coach"><Text size={13.5}>🔔 Kalzo te demandera l’autorisation d’envoyer des notifications quand tu activeras un rappel : pour te prévenir à l’heure du repas et quand un ami te répond.</Text></Card> : null}

      <SectionTitle>Rappels du repas (sur ton téléphone)</SectionTitle>
      {(['dejeuner', 'diner'] as Slot[]).map(slot => (
        <Card key={slot} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text weight={700}>Rappel du {SLOT_LABEL[slot]}</Text>
              <Text size={12.5} color="muted">Annulé automatiquement si tu as déjà posté ton {SLOT_LABEL[slot]}.</Text>
            </View>
            <Switch value={r.enabled[slot]} onValueChange={v => toggleReminder(slot, v)} trackColor={{ true: colors.primary }} accessibilityLabel={`Rappel du ${SLOT_LABEL[slot]}`} />
          </View>
          {r.enabled[slot] ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="15 minutes plus tôt" onPress={() => persist({ ...r, times: { ...r.times, [slot]: step(r.times[slot], -15) } })} style={{ width: 48, height: 44, borderRadius: 14, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}><Text size={20} weight={800}>−</Text></Pressable>
              <Text size={28} weight={800} tabular accessibilityLabel={`Heure : ${r.times[slot].replace(':', ' heures ')}`}>{r.times[slot]}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="15 minutes plus tard" onPress={() => persist({ ...r, times: { ...r.times, [slot]: step(r.times[slot], 15) } })} style={{ width: 48, height: 44, borderRadius: 14, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}><Text size={20} weight={800}>+</Text></Pressable>
            </View>
          ) : null}
        </Card>
      ))}

      <SectionTitle>Activité sociale</SectionTitle>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><Text weight={700}>Demandes d’ami</Text><Text size={12.5} color="muted">Nouvelle demande, ou demande acceptée.</Text></View>
          <Switch value={social.notif_friend_requests} onValueChange={v => toggleSocial('notif_friend_requests', v)} trackColor={{ true: colors.primary }} accessibilityLabel="Notifications de demandes d’ami" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><Text weight={700}>Un ami a posté son repas</Text><Text size={12.5} color="muted">Au plus une notification par ami, par déjeuner et par dîner.</Text></View>
          <Switch value={social.notif_friend_meals} onValueChange={v => toggleSocial('notif_friend_meals', v)} trackColor={{ true: colors.primary }} accessibilityLabel="Notifications quand un ami poste" />
        </View>
      </Card>
    </Screen>
  )
}
