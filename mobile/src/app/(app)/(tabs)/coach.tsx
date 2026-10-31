import { useState } from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useData } from '@/state/data'
import { useSession } from '@/state/session'
import { Card, Screen, SectionTitle, useTone } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useCoachAccess } from '@/components/coach'
import { TAB_BAR_HEIGHT } from '@/components/FloatingTabBar'
import { useTheme } from '@/theme'
import * as haptics from '@/lib/haptics'

const TOOLS = [
  { href: '/coach/frigo', icon: 'nutrition' as const, title: 'Frigo Vide', text: 'Une recette avec ce qu’il te reste à la maison.' },
  { href: '/coach/restaurant', icon: 'restaurant' as const, title: 'Restaurant', text: 'Photographie la carte, repère le meilleur choix.' },
  { href: '/coach/plan', icon: 'calendar' as const, title: 'Plan 7 jours', text: 'Un menu complet pour la semaine, adapté à toi.' },
  { href: '/coach/batch', icon: 'file-tray-full' as const, title: 'Batch cooking', text: 'Cuisine une fois, mange toute la semaine.' },
]

export default function Coach() {
  const { colors } = useTheme()
  const router = useRouter()
  const coach = useTone('coach')
  const { allowed, plan } = useCoachAccess()
  const { currentPlan } = useData()
  const { account } = useSession()
  const [now] = useState(() => Date.now())
  const trialDays = account?.ai?.trial_ends_at ? Math.max(0, Math.ceil((new Date(account.ai.trial_ends_at).getTime() - now) / 86400000)) : 0

  const open = (href: string) => {
    haptics.tap()
    // Verrou d'interface seulement : le contrôle réel est fait côté serveur à chaque appel.
    if (!allowed) router.push({ pathname: '/paywall', params: { reason: 'subscription_required' } })
    else router.push(href as never)
  }

  return (
    <Screen bottomPad={TAB_BAR_HEIGHT + 24}>
      <View>
        <Text size={30} weight={800} accessibilityRole="header" style={{ letterSpacing: -0.6 }}>Coach IA</Text>
        <Text color="muted">Ton assistant nutrition</Text>
      </View>

      {!allowed ? (
        <Card onPress={() => router.push({ pathname: '/paywall', params: { reason: 'subscription_required' } })} style={{ backgroundColor: colors.coach, borderWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel="Bloqué sans abonnement. Souscrire.">
          <Ionicons name="lock-closed" size={28} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text color="white" weight={800} size={16}>{plan === 'essentiel' ? 'Disponible avec Plus' : 'Bloqué sans abonnement'}</Text>
            <Text color="white" size={13} style={{ opacity: 0.9 }}>{plan === 'essentiel' ? 'Passe à l’offre Plus pour débloquer le coach.' : 'Le coach est inclus avec l’offre Plus.'}</Text>
          </View>
          <Text color="white" weight={800}>Souscrire ›</Text>
        </Card>
      ) : plan === 'trial' ? (
        <Card tone="coach"><Text size={13.5}>🎁 Le coach est inclus pendant ton essai ({trialDays} jour{trialDays > 1 ? 's' : ''} restant{trialDays > 1 ? 's' : ''}).</Text></Card>
      ) : null}

      <View style={{ gap: 10, opacity: allowed ? 1 : 0.55 }}>
        {TOOLS.map(t => (
          <Card key={t.href} onPress={() => open(t.href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} accessibilityLabel={`${t.title}. ${t.text}${allowed ? '' : ' Verrouillé.'}`}>
            <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: coach.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={t.icon} size={26} color={coach.main} />
            </View>
            <View style={{ flex: 1 }}>
              <Text size={16} weight={800}>{t.title}{t.href.endsWith('plan') && currentPlan ? '  ' : ''}</Text>
              <Text size={13} color="muted">{t.text}</Text>
            </View>
            <Ionicons name={allowed ? 'chevron-forward' : 'lock-closed'} size={20} color={colors.mutedFg} />
          </Card>
        ))}
      </View>

      <SectionTitle>Gratuit</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card tone="nutri" style={{ flex: 1, gap: 6 }} onPress={() => router.push('/meal-manual')}><Ionicons name="search" size={24} color={colors.nutri} /><Text weight={800}>Chercher un aliment</Text><Text size={12} color="muted">Nom ou code-barres</Text></Card>
        <Card tone="nutri" style={{ flex: 1, gap: 6 }} onPress={() => router.push('/coach/recipes')}><Ionicons name="book" size={24} color={colors.nutri} /><Text weight={800}>Recettes</Text><Text size={12} color="muted">Plus de 200 idées équilibrées</Text></Card>
      </View>
    </Screen>
  )
}
