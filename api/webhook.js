/**
 * AI4Teachers — Stripe Webhook Handler
 *
 * POST /api/webhook
 * Handles checkout.session.completed and subscription events.
 * Logs successful purchases for fulfillment tracking.
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET — whsec_...
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Vercel requires raw body for webhook signature verification
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Read raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      console.log('=== PURCHASE COMPLETED ===');
      console.log('Customer:', session.customer_details?.email);
      console.log('Amount:', session.amount_total / 100, session.currency?.toUpperCase());
      console.log('Product:', session.metadata?.product);
      console.log('Mode:', session.mode);
      console.log('Session ID:', session.id);
      console.log('========================');

      // TODO: Send course access links via email (Resend)
      // TODO: Auto-enroll student in Google Classroom via API

      break;
    }

    case 'customer.subscription.created': {
      const subscription = event.data.object;
      console.log('=== SUBSCRIPTION CREATED ===');
      console.log('Customer:', subscription.customer);
      console.log('Product:', subscription.metadata?.product);
      console.log('Status:', subscription.status);
      console.log('============================');
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      console.log('=== SUBSCRIPTION UPDATED ===');
      console.log('Customer:', subscription.customer);
      console.log('Status:', subscription.status);
      console.log('Cancel at period end:', subscription.cancel_at_period_end);
      console.log('============================');
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      console.log('=== SUBSCRIPTION CANCELLED ===');
      console.log('Customer:', subscription.customer);
      console.log('Product:', subscription.metadata?.product);
      console.log('==============================');

      // TODO: Revoke Google Classroom access on cancellation
      break;
    }

    case 'checkout.session.expired': {
      console.log('Checkout expired:', event.data.object.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};

// Disable Vercel body parsing (needed for raw body in webhook verification)
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
