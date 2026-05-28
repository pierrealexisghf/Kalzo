import crypto from 'crypto';
export const config = { api: { bodyParser: false } };

const SUPABASE_URL = 'https://yqvyguyxjnktajbnmavw.supabase.co';
const PRICE_STANDARD = 'price_1Tc6S51JEMfMTdulDYObGtXg';
const PRICE_VIP      = 'price_1Tc6Sf1JEMfMTdulDT6umOCm';
const CREDITS_STANDARD = 120;

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyStripeSignature(payload, signature, secret) {
  const elements = signature.split(',');
  const timestamp = elements.find(e => e.startsWith('t=')).split('=')[1];
  const sig = elements.find(e => e.startsWith('v1=')).split('=')[1];
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
}

function getPlanFromPriceId(priceId) {
  if (priceId === PRICE_VIP) return 'vip';
  if (priceId === PRICE_STANDARD) return 'standard';
  return 'free';
}

async function updateProfile(userId, data) {
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY;
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE,
      'Authorization': `Bearer ${SUPABASE_SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
}

async function updateCredits(userId, plan) {
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY;

  // VIP = crédits illimités (on met 999999), Standard = 120
  const newBalance = plan === 'vip' ? 999999 : CREDITS_STANDARD;

  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/credits?user_id=eq.${userId}&select=balance`, {
    headers: { 'apikey': SUPABASE_SERVICE, 'Authorization': `Bearer ${SUPABASE_SERVICE}` }
  });
  const existing = await getRes.json();

  if (existing.length > 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/credits?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE,
        'Authorization': `Bearer ${SUPABASE_SERVICE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ balance: newBalance, updated_at: new Date().toISOString() })
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  try {
    if (!verifyStripeSignature(rawBody.toString(), signature, process.env.STRIPE_WEBHOOK_SECRET)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
  } catch(e) {
    return res.status(400).json({ error: 'Signature error' });
  }

  const event = JSON.parse(rawBody.toString());
  const obj = event.data.object;

  switch (event.type) {

    // Abonnement créé ou trial démarré
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') break;
      const userId = obj.metadata?.user_id;
      const plan = obj.metadata?.plan;
      if (!userId || !plan) break;

      const trialEnd = obj.subscription_data?.trial_end
        ? new Date(obj.subscription_data.trial_end * 1000).toISOString()
        : null;

      await updateProfile(userId, {
        plan,
        subscription_id: obj.subscription,
        subscription_status: trialEnd ? 'trialing' : 'active',
        trial_ends_at: trialEnd,
        current_period_end: null,
      });

      // Donner les crédits dès le début (trial inclus)
      await updateCredits(userId, plan);
      break;
    }

    // Paiement réussi = renouvellement mensuel
    case 'invoice.payment_succeeded': {
      const subId = obj.subscription;
      const priceId = obj.lines?.data?.[0]?.price?.id;
      const userId = obj.subscription_details?.metadata?.user_id
                  || obj.metadata?.user_id;
      if (!userId || !priceId) break;

      const plan = getPlanFromPriceId(priceId);
      const periodEnd = obj.lines?.data?.[0]?.period?.end
        ? new Date(obj.lines.data[0].period.end * 1000).toISOString()
        : null;

      await updateProfile(userId, {
        plan,
        subscription_id: subId,
        subscription_status: 'active',
        current_period_end: periodEnd,
        trial_ends_at: null,
      });

      // Reset crédits chaque mois
      await updateCredits(userId, plan);
      break;
    }

    // Paiement échoué
    case 'invoice.payment_failed': {
      const userId = obj.subscription_details?.metadata?.user_id
                  || obj.metadata?.user_id;
      if (!userId) break;

      await updateProfile(userId, {
        subscription_status: 'past_due',
      });
      break;
    }

    // Abonnement résilié (fin de période)
    case 'customer.subscription.deleted': {
      const userId = obj.metadata?.user_id;
      if (!userId) break;

      await updateProfile(userId, {
        plan: 'free',
        subscription_id: null,
        subscription_status: 'inactive',
        current_period_end: null,
        trial_ends_at: null,
      });

      // Remettre les crédits à 0
      await updateCredits(userId, 'free');
      break;
    }

    default:
      break;
  }

  return res.status(200).json({ received: true });
}
