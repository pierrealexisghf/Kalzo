import { Platform } from 'react-native'
import Purchases, { type PurchasesPackage } from 'react-native-purchases'

// Achats intégrés Apple via RevenueCat. Un seul groupe d'abonnements : 2 offres × 2 durées = 4 produits au lancement.
export type PaidPlan = 'essentiel' | 'plus' | 'illimite'
export type Duration = 'monthly' | 'quarterly' | 'annual'
// Offres proposées au lancement : Essentiel et Plus, en mensuel ou annuel (Illimité et le trimestriel restent
// reconnus côté serveur pour d'éventuels achats futurs, mais ne sont pas affichés).
export const PAID_PLANS: PaidPlan[] = ['essentiel', 'plus']
export const DURATIONS: { id: Duration; label: string; months: number }[] = [
  { id: 'monthly', label: 'Mensuel', months: 1 }, { id: 'annual', label: 'Annuel', months: 12 },
]
export const productId = (plan: PaidPlan, d: Duration) => `fr.kalzo.${plan}.${d}`

// Prix de départ (App Store Connect fait foi : le prix affiché vient du produit quand il est chargé).
export const DEFAULT_PRICES: Record<PaidPlan, Record<Duration, number>> = {
  essentiel: { monthly: 3.99, quarterly: 9.99, annual: 29.99 },
  plus: { monthly: 6.99, quarterly: 17.99, annual: 49.99 },
  illimite: { monthly: 10.99, quarterly: 28.99, annual: 89.99 },
}
export const fmtEur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

export const PLAN_INFO: Record<PaidPlan, { name: string; scans: string; coach: boolean; badge?: string }> = {
  essentiel: { name: 'Essentiel', scans: '30 scans par semaine', coach: false },
  plus: { name: 'Plus', scans: '30 scans par semaine', coach: true, badge: 'Recommandé' },
  illimite: { name: 'Illimité', scans: 'Scans illimités', coach: true },
}

/** Économie par rapport à 3 ou 12 mensualités, en pourcentage. */
export function savingPct(plan: PaidPlan, d: Duration, prices = DEFAULT_PRICES): number {
  const months = DURATIONS.find(x => x.id === d)!.months
  if (months === 1) return 0
  return Math.round((1 - prices[plan][d] / (prices[plan].monthly * months)) * 100)
}

let configured = false
const apiKey = Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY })
export const purchasesAvailable = () => Boolean(apiKey)

/** À appeler une fois connecté : l'identifiant RevenueCat est l'identifiant Supabase de l'utilisateur. */
export async function initPurchases(userId: string) {
  if (!apiKey) return
  if (!configured) { Purchases.configure({ apiKey, appUserID: userId }); configured = true }
  else await Purchases.logIn(userId)
}
export async function resetPurchases() {
  if (configured) await Purchases.logOut().catch(() => {})
}

export async function loadPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return []
  const offerings = await Purchases.getOfferings()
  return offerings.current?.availablePackages ?? []
}
export const findPackage = (pkgs: PurchasesPackage[], plan: PaidPlan, d: Duration) =>
  pkgs.find(p => p.product.identifier.startsWith(productId(plan, d)))

export async function buy(pkg: PurchasesPackage): Promise<'ok' | 'cancelled'> {
  try { await Purchases.purchasePackage(pkg); return 'ok' } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return 'cancelled'
    throw e
  }
}
export async function restore() { await Purchases.restorePurchases() }

export const MANAGE_URL = 'https://apps.apple.com/account/subscriptions'
