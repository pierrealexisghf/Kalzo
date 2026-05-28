export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const SUPABASE_URL = 'https://yqvyguyxjnktajbnmavw.supabase.co';
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY;

  try {
    // 1. Récupérer le subscription_id depuis Supabase
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=subscription_id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE,
          'Authorization': `Bearer ${SUPABASE_SERVICE}`,
        }
      }
    );
    const profiles = await profileRes.json();
    const subscriptionId = profiles?.[0]?.subscription_id;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Aucun abonnement actif trouvé' });
    }

    // 2. Annuler l'abonnement sur Stripe en fin de période (cancel_at_period_end)
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'cancel_at_period_end=true'
      }
    );
    const subscription = await stripeRes.json();
    if (subscription.error) throw new Error(subscription.error.message);

    // 3. Mettre à jour Supabase : statut = cancelling (actif jusqu'à la fin)
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE,
        'Authorization': `Bearer ${SUPABASE_SERVICE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription_status: 'cancelling',
      })
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
