import { useState } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/state/session'
import { Button, Field, Header, Input, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { USERNAME_ERRORS, useUsernameCheck } from '../../(setup)/username'
import { formatDay, dateKey } from '@/lib/logic/dates'

export default function EditUsername() {
  const router = useRouter()
  const toast = useToast()
  const { account, setUsername } = useSession()
  const [value, setValue] = useState(account?.username ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const check = useUsernameCheck(value, account?.username)
  const [now] = useState(() => Date.now())
  const next = account?.username_changed_at ? new Date(new Date(account.username_changed_at).getTime() + 30 * 86400000) : null
  const locked = !!next && next.getTime() > now

  const save = async () => {
    setSaving(true); setError('')
    const { data, error: err } = await supabase.rpc('set_username', { p_username: value.trim().toLowerCase() })
    setSaving(false)
    if (err) return setError('Impossible d’enregistrer pour le moment.')
    if (!data.ok) return setError(USERNAME_ERRORS[data.reason] ?? 'Pseudo refusé.')
    setUsername(data.username); toast.show('Pseudo modifié', 'success'); router.back()
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Mon pseudo" onBack />
        <Field label="Pseudo" hint={check.status === 'ok' ? '✓ Disponible' : check.status === 'checking' ? 'Vérification…' : undefined} error={check.status === 'bad' ? USERNAME_ERRORS[check.reason ?? ''] : error || null}>
          <Input value={value} onChangeText={t => setValue(t.toLowerCase())} autoCapitalize="none" autoCorrect={false} maxLength={20} editable={!locked} invalid={check.status === 'bad'} />
        </Field>
        <Text size={12.5} color="muted">{locked && next ? `Tu pourras le modifier de nouveau le ${formatDay(dateKey(next), false)}.` : 'Un seul changement tous les 30 jours.'}</Text>
        <Button label="Enregistrer" onPress={save} loading={saving} disabled={locked || check.status !== 'ok'} size="lg" />
      </Screen>
    </KeyboardAvoidingView>
  )
}
