/**
 * AI4Teachers — Stripe Checkout Session Creator
 *
 * POST /api/checkout
 * Creates a Stripe Checkout Session for course purchases.
 * Supports individual courses, full certification bundle, and subscriptions.
 *
 * Request body:
 *   { "product": "certification-bundle" | "12-week-course" | "course-1" ... "course-5", "email": "optional@email.com" }
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY — sk_live_... or sk_test_...
 *   DOMAIN — https://ai4teachers.co (or http://localhost:3000 for dev)
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ─── Product Catalog ───────────────────────────────────────────────
const PRODUCTS = {
  // Full 5-Course AI Teacher Certification Bundle (best value)
  'certification-bundle': {
    name: 'AI Teacher Certification — Full Bundle',
    description: 'All 5 certification courses: Prompt Engineering, Instructional Design, Assessment, Differentiation & Accessibility, Professional Practice. Includes certificate of completion.',
    amount: 14900, // $149.00
    mode: 'payment',
  },

  // 12-Week Comprehensive Course
  '12-week-course': {
    name: 'Introduction to AI for Educators — 12-Week Course',
    description: 'Complete 12-week deep dive into AI for teaching. Weekly lessons, hands-on projects, and a final portfolio.',
    amount: 7900, // $79.00
    mode: 'payment',
  },

  // Individual Certification Courses
  'course-1': {
    name: 'Course 1: Prompt Engineering for Educators',
    description: '6 modules covering prompt design, iteration, advanced techniques, and building prompt libraries for teaching.',
    amount: 3900, // $39.00
    mode: 'payment',
  },
  'course-2': {
    name: 'Course 2: AI-Powered Instructional Design',
    description: '6 modules on AI-assisted unit planning, standards unpacking, assessment design, and differentiation.',
    amount: 3900,
    mode: 'payment',
  },
  'course-3': {
    name: 'Course 3: AI-Enhanced Assessment & Feedback',
    description: '6 modules on building rubrics, automated feedback, formative assessment, and data-driven instruction with AI.',
    amount: 3900,
    mode: 'payment',
  },
  'course-4': {
    name: 'Course 4: AI for Differentiation & Accessibility',
    description: '6 modules on using AI to differentiate instruction, support IEPs/504s, multilingual learners, and UDL.',
    amount: 3900,
    mode: 'payment',
  },
  'course-5': {
    name: 'Course 5: AI in Professional Practice',
    description: '6 modules on AI workflows, collaboration, ethics, integration planning, and building your AI teaching toolkit.',
    amount: 3900,
    mode: 'payment',
  },

  // Monthly subscription for ongoing access + updates
  'monthly-subscription': {
    name: 'AI4Teachers Pro — Monthly',
    description: 'Full access to all courses, new content monthly, community, and live workshops.',
    amount: 1900, // $19/month
    mode: 'subscription',
    interval: 'month',
  },

  // Annual subscription (best value for recurring)
  'annual-subscription': {
    name: 'AI4Teachers Pro — Annual',
    description: 'Full access to all courses, new content monthly, community, and live workshops. Save 37% vs monthly.',
    amount: 14900, // $149/year
    mode: 'subscription',
    interval: 'year',
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const domain = process.env.DOMAIN || 'https://ai4teachers.co';
    const { product: productId, email } = req.body || {};

    // Validate product
    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(400).json({
        error: 'Invalid product',
        valid_products: Object.keys(PRODUCTS),
      });
    }

    // Build line item based on mode
    const lineItem = product.mode === 'subscription'
      ? {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.amount,
            recurring: { interval: product.interval },
          },
          quantity: 1,
        }
      : {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.amount,
          },
          quantity: 1,
        };

    // Build checkout session options
    const sessionOptions = {
      mode: product.mode,
      line_items: [lineItem],

      // Collect email for course delivery
      customer_email: email || undefined,
      customer_creation: 'always',

      // URLs
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/#pricing`,

      // Allow promotion codes (coupons for teachers)
      allow_promotion_codes: true,

      // Metadata for webhook processing
      metadata: {
        product: productId,
        version: '1.0.0',
        platform: 'ai4teachers',
      },
    };

    // Statement descriptor for one-time payments
    if (product.mode === 'payment') {
      sessionOptions.payment_intent_data = {
        statement_descriptor: 'AI4TEACHERS',
        statement_descriptor_suffix: 'COURSE',
      };
    }

    // Statement descriptor for subscriptions
    if (product.mode === 'subscription') {
      sessionOptions.subscription_data = {
        metadata: {
          product: productId,
          platform: 'ai4teachers',
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    // Redirect to Stripe Checkout
    res.status(303).setHeader('Location', session.url);
    res.end();
  } catch (error) {
    console.error('Checkout error:', error.message);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
};
