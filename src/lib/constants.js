// Offres Kalzo. Les identifiants de prix Stripe ne sont pas secrets, mais le
// serveur est seul juge : le navigateur n'envoie que le NOM du plan.
export const PLANS = {
  standard: { priceId: 'price_1Tc6S51JEMfMTdulDYObGtXg', credits: 120, label: '6,99 €' },
  vip: { priceId: 'price_1Tc6Sf1JEMfMTdulDT6umOCm', credits: 999999, label: '9,99 €' },
}

export const FREE_SIGNUP_CREDITS = 10

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kalzo.vercel.app'

export function planFromPriceId(priceId) {
  const entry = Object.entries(PLANS).find(([, p]) => p.priceId === priceId)
  return entry ? entry[0] : 'free'
}
