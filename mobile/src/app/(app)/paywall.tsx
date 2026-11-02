import { useEffect, useMemo, useState } from 'react'
import { Linking, Platform, Pressable, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { PurchasesPackage } from 'react-native-purchases'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/state/session'
import { Button, Card, Header, Screen, Segmented } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'
import { ScanBalance } from '@/components/ScanBalance'
import { radius, useTheme } from '@/theme'
import {
  DEFAULT_PRICES, DURATIONS, MANAGE_URL, PAID_PLANS, PLAN_INFO, buy, findPackage, fmtEur, loadPackages, purchasesAvailable, redeemCode, restore, savingPct,
  type Duration, type PaidPlan,
} from '@/lib/purchases'
import * as haptics from '@/lib/haptics'

const SITE = 'https://kalzo.vercel.app'
const REASONS: Record<string, string> = {
  quota_weekly: 'Tu as utilisé tous tes scans de la semaine. Choisis une offre pour continuer à scanner.',
  subscription_required: 'Le coach IA est inclus avec l’offre Plus.',
}

export default function Paywall() {
  const { colors } = useTheme()
  const router = useRouter()
  const toast = useToast()
  const { reason } = useLocalSearchParams<{ reason?: string }>()
  const { account, refreshAccount } = useSession()
  const [duration, setDuration] = useState<Duration>('annual')
  const [selected, setSelected] = useState<PaidPlan>('plus')
  const [packages, setPackages] = useState<PurchasesPackage[]>([])
  const [busy, setBusy] = useState(false)
  const current = account?.ai?.plan

  useEffect(() => { loadPackages().then(setPackages).catch(() => {}) }, [])

  // Prix réels du store quand disponibles, sinon prix de départ.
  const price = (plan: PaidPlan, d: Duration) => findPackage(packages, plan, d)?.product.price ?? DEFAULT_PRICES[plan][d]
  const label = (plan: PaidPlan, d: Duration) => findPackage(packages, plan, d)?.product.priceString ?? fmtEur(DEFAULT_PRICES[plan][d])
  const prices = useMemo(() => Object.fromEntries(PAID_PLANS.map(p => [p, Object.fromEntries(DURATIONS.map(d => [d.id, price(p, d.id)]))])) as typeof DEFAULT_PRICES, [packages]) // eslint-disable-line react-hooks/exhaustive-deps

  // L'accès se lit en base (webhook RevenueCat → profil) : on attend la mise à jour avant de fermer.
  const waitForActivation = async () => {
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const { data } = await supabase.rpc('my_ai_status')
      if (data && !['free'].includes(data.plan) && data.plan !== 'trial') { await refreshAccount(); return true }
    }
    await refreshAccount()
    return false
  }

  const subscribe = async () => {
    const pkg = findPackage(packages, selected, duration)
    if (!pkg) return toast.show(purchasesAvailable() ? 'Cette offre n’est pas disponible pour le moment.' : 'Les achats seront disponibles dans la version publiée de l’app.', 'error')
    setBusy(true)
    try {
      if ((await buy(pkg)) === 'ok') {
        haptics.success(); toast.show('Merci ! Activation de ton abonnement…', 'success')
        const ok = await waitForActivation()
        toast.show(ok ? 'Abonnement activé 🎉' : 'Ton abonnement sera activé dans un instant.', ok ? 'success' : 'info')
        router.back()
      }
    } catch { toast.show('L’achat n’a pas abouti. Tu n’as pas été débité.', 'error') }
    setBusy(false)
  }
  const doRestore = async () => {
    setBusy(true)
    try { await restore(); await waitForActivation(); toast.show('Achats restaurés', 'success') } catch { toast.show('Aucun achat à restaurer.', 'error') }
    setBusy(false)
  }

  const doRedeem = async () => {
    setBusy(true)
    try { await redeemCode(); await waitForActivation() } catch { toast.show('Impossible d’ouvrir la saisie du code.', 'error') }
    setBusy(false)
  }

  const store = Platform.OS === 'ios' ? 'ton compte Apple' : 'ton compte Google'
  return (
    <Screen>
      <Header title="Offres" subtitle="Essai gratuit de 7 jours à l’inscription" onBack />
      {reason && REASONS[reason] ? <Card tone="coach"><Text weight={600}>{REASONS[reason]}</Text></Card> : null}
      <ScanBalance />
      <Segmented value={duration} onChange={setDuration} options={DURATIONS.map(d => ({ id: d.id, label: d.id === 'monthly' ? d.label : `${d.label} · -${savingPct('plus', d.id, prices)} %` }))} />

      {PAID_PLANS.map(plan => {
        const info = PLAN_INFO[plan]
        const active = selected === plan
        const pct = savingPct(plan, duration, prices)
        const months = DURATIONS.find(d => d.id === duration)!.months
        return (
          <Pressable key={plan} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${info.name}, ${label(plan, duration)}, ${info.scans}${info.coach ? ', coach IA inclus' : ''}`} onPress={() => { haptics.select(); setSelected(plan) }}
            style={{ borderRadius: radius.xl, padding: 16, gap: 8, backgroundColor: colors.card, borderWidth: active ? 2.5 : 1, borderColor: active ? colors.primary : colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text size={20} weight={800} style={{ flex: 1 }}>{info.name}</Text>
              {info.badge ? <View style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}><Text size={11.5} weight={800} style={{ color: colors.primaryFg }}>{info.badge}</Text></View> : null}
              {current === plan ? <Text size={12} weight={700} color="nutri">Offre actuelle</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text size={26} weight={800} tabular>{label(plan, duration)}</Text>
              <Text size={13} color="muted">{duration === 'monthly' ? '/ mois' : duration === 'quarterly' ? '/ 3 mois' : '/ an'}</Text>
              {pct > 0 ? <Text size={12.5} weight={800} color="nutri">-{pct} %</Text> : null}
            </View>
            {months > 1 ? <Text size={12} color="muted">soit {fmtEur(price(plan, duration) / months)} par mois</Text> : null}
            <View style={{ gap: 4 }}>
              <Text size={14}>✓ {info.scans}</Text>
              <Text size={14} color={info.coach ? 'fg' : 'muted'}>{info.coach ? '✓' : '✕'} Coach IA (Frigo Vide, Restaurant, Plan 7 jours, Batch cooking)</Text>
              <Text size={14}>✓ Feed, amis, journal, sport, eau : toujours gratuits</Text>
            </View>
          </Pressable>
        )
      })}

      <Button label={`Choisir ${PLAN_INFO[selected].name} · ${label(selected, duration)}`} size="lg" onPress={subscribe} loading={busy} />
      <Button label="Restaurer mes achats" variant="ghost" onPress={doRestore} disabled={busy} />
      {Platform.OS === 'ios' && purchasesAvailable() ? <Button label="J’ai un code promo" variant="ghost" onPress={doRedeem} disabled={busy} /> : null}
      <Text size={11.5} color="muted" center>
        L’abonnement est facturé via {store} et se renouvelle automatiquement à la fin de chaque période, sauf résiliation au moins 24 h avant. Tu peux le gérer ou le résilier à tout moment dans les réglages de {Platform.OS === 'ios' ? 'ton compte Apple (Réglages › ton nom › Abonnements)' : 'Google Play'}. Le paiement est débité à la confirmation de l’achat.
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
        <Text size={12.5} weight={700} color="primary" onPress={() => Linking.openURL(`${SITE}/cgv`)}>Conditions de vente</Text>
        <Text size={12.5} weight={700} color="primary" onPress={() => Linking.openURL(`${SITE}/cgu`)}>Conditions d’utilisation</Text>
        <Text size={12.5} weight={700} color="primary" onPress={() => Linking.openURL(`${SITE}/confidentialite`)}>Confidentialité</Text>
      </View>
      {Platform.OS === 'ios' ? <Button label="Gérer mon abonnement" variant="ghost" size="sm" onPress={() => Linking.openURL(MANAGE_URL)} /> : null}
    </Screen>
  )
}
