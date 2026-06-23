export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { priceId, userId, userEmail } = req.body;
    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://kalzo.vercel.app';
    // Déterminer le plan selon le priceId
    const PRICE_STANDARD = 'price_1Tc6S51JEMfMTdulDYObGtXg';
    const PRICE_VIP      = 'price_1Tc6Sf1JEMfMTdulDT6umOCm';
    let plan = 'unknown';
    if (priceId === PRICE_STANDARD) plan = 'standard';
    if (priceId === PRICE_VIP)      plan = 'vip';
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'mode': 'subscription',                          // ← abonnement récurrent
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${siteUrl}?payment=success&plan=${plan}`,
      'cancel_url': `${siteUrl}?payment=cancelled`,
      'customer_email': userEmail,
      'metadata[user_id]': userId,
      'metadata[plan]': plan,
      // Essai gratuit 7 jours
      'subscription_data[trial_period_days]': '7',
      'subscription_data[metadata][user_id]': userId,
      'subscription_data[metadata][plan]': plan,
      // Autoriser les codes promo sur la page Stripe Checkout
      'allow_promotion_codes': 'true',
    });
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    const session = await response.json();
    if (session.error) throw new Error(session.error.message);
    return res.status(200).json({ url: session.url });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
