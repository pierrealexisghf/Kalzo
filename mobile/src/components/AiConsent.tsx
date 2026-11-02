import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Linking, Modal, ScrollView, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { radius, useTheme } from '@/theme'

// Consentement explicite avant d'envoyer des données à l'IA tierce (Anthropic) : photo du repas, description, profil.
// Le choix est gardé sur le compte (métadonnées d'authentification), donc il suit l'utilisateur d'un appareil à l'autre.
const SITE = 'https://kalzo.vercel.app'
const KEY = 'ai_consent_at'

type Ctx = { ensure: () => Promise<boolean>; revoke: () => Promise<void>; granted: () => Promise<boolean> }
const AiConsentContext = createContext<Ctx>({ ensure: async () => true, revoke: async () => {}, granted: async () => true })
export const useAiConsent = () => useContext(AiConsentContext)

async function isGranted() {
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session?.user.user_metadata?.[KEY])
}

export function AiConsentProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const pending = useRef<((ok: boolean) => void) | null>(null)

  const ensure = useCallback(async () => {
    if (await isGranted()) return true
    return new Promise<boolean>(resolve => { pending.current = resolve; setOpen(true) })
  }, [])

  const finish = (ok: boolean) => { setOpen(false); pending.current?.(ok); pending.current = null }

  const accept = async () => {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { [KEY]: new Date().toISOString() } })
    setSaving(false)
    finish(!error)
  }

  const revoke = useCallback(async () => { await supabase.auth.updateUser({ data: { [KEY]: null } }) }, [])
  const value = useMemo(() => ({ ensure, revoke, granted: isGranted }), [ensure, revoke])

  return (
    <AiConsentContext.Provider value={value}>
      {children}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => finish(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%', paddingTop: 22 }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 8, gap: 12 }}>
              <Text size={24} weight={800}>Analyse par intelligence artificielle</Text>
              <Text color="muted">Pour estimer tes repas et répondre au coach, Kalzo envoie des données à un service d’IA tiers : <Text weight={700}>Anthropic (Claude)</Text>.</Text>
              <View style={{ gap: 6 }}>
                <Text size={14} weight={700}>Ce qui est envoyé</Text>
                <Text size={14}>• La photo de ton repas ou ta description, quand tu lances un scan.</Text>
                <Text size={14}>• Tes repères (poids, objectif, besoins en calories), pour adapter les conseils du coach.</Text>
              </View>
              <Text size={14} color="muted">Ces données servent uniquement à produire la réponse. Selon les conditions d’Anthropic, elles ne servent pas à entraîner ses modèles. Elles ne sont jamais montrées à tes amis.</Text>
              <Text size={14} color="muted">Tu peux retirer ton accord à tout moment dans Profil, et saisir tes repas à la main sans IA.</Text>
              <Text size={13.5} weight={700} color="primary" onPress={() => Linking.openURL(`${SITE}/confidentialite`)}>Lire la politique de confidentialité</Text>
            </ScrollView>
            <View style={{ padding: 22, paddingBottom: 34, gap: 8 }}>
              <Button label="J’accepte" size="lg" onPress={accept} loading={saving} />
              <Button label="Pas maintenant" variant="ghost" onPress={() => finish(false)} disabled={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </AiConsentContext.Provider>
  )
}
