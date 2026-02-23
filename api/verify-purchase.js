/**
 * AI4Teachers — Purchase Verification
 *
 * GET /api/verify-purchase?session_id=cs_...
 * Verifies a completed Stripe Checkout Session and returns course access info.
 * Returns Google Classroom join links for the purchased course(s).
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY — sk_live_... or sk_test_...
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Google Classroom course join links keyed by product ID
const COURSE_ACCESS = {
  'course-1': {
    name: 'Course 1: Prompt Engineering for Educators',
    classroomId: 'ODQ0NzcxNTgwMDk5',
    joinUrl: 'https://classroom.google.com/c/ODQ0NzcxNTgwMDk5',
  },
  'course-2': {
    name: 'Course 2: AI-Powered Instructional Design',
    classroomId: 'ODQ0ODI0NTAwNTAy',
    joinUrl: 'https://classroom.google.com/c/ODQ0ODI0NTAwNTAy',
  },
  'course-3': {
    name: 'Course 3: AI-Enhanced Assessment & Feedback',
    classroomId: 'ODQ1MDAyMDgxNzQx',
    joinUrl: 'https://classroom.google.com/c/ODQ1MDAyMDgxNzQx',
  },
  'course-4': {
    name: 'Course 4: AI for Differentiation & Accessibility',
    classroomId: 'ODQ1MDA1NjcxOTI5',
    joinUrl: 'https://classroom.google.com/c/ODQ1MDA1NjcxOTI5',
  },
  'course-5': {
    name: 'Course 5: AI in Professional Practice',
    classroomId: 'ODQ1MDEwNTQ5NjAz',
    joinUrl: 'https://classroom.google.com/c/ODQ1MDEwNTQ5NjAz',
  },
  '12-week-course': {
    name: 'Introduction to AI for Educators — 12-Week Course',
    classroomId: 'NzkzNzg3MzIzMzAy',
    joinUrl: 'https://classroom.google.com/c/NzkzNzg3MzIzMzAy',
  },
};

// Bundle products map to multiple courses
const BUNDLE_COURSES = {
  'certification-bundle': ['course-1', 'course-2', 'course-3', 'course-4', 'course-5'],
};

// Subscription products grant access to everything
const SUBSCRIPTION_PRODUCTS = ['monthly-subscription', 'annual-subscription'];

function getCoursesForProduct(productId) {
  // Bundle → all 5 certification courses
  if (BUNDLE_COURSES[productId]) {
    return BUNDLE_COURSES[productId].map((id) => COURSE_ACCESS[id]);
  }

  // Subscription → all courses
  if (SUBSCRIPTION_PRODUCTS.includes(productId)) {
    return Object.values(COURSE_ACCESS);
  }

  // Individual course
  if (COURSE_ACCESS[productId]) {
    return [COURSE_ACCESS[productId]];
  }

  return [];
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.session_id;

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({
        error: 'Payment not completed',
        status: session.payment_status,
      });
    }

    const productId = session.metadata?.product;
    const courses = getCoursesForProduct(productId);

    // Return purchase confirmation with course access
    res.status(200).json({
      success: true,
      customer_email: session.customer_details?.email,
      product: productId,
      courses,
    });
  } catch (error) {
    console.error('Verify error:', error.message);
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
};
