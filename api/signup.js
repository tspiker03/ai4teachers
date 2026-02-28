/**
 * AI4Teachers — Email Signup Handler
 *
 * POST /api/signup
 * Body: { email: "teacher@school.edu", source: "free-course" }
 *
 * 1. Submits email to Google Forms (lead capture)
 * 2. Sends welcome email via Resend
 * 3. Returns success
 *
 * Environment variables:
 *   RESEND_API_KEY — Required for sending welcome emails
 */

// ---------- Welcome email HTML ----------
function buildWelcomeEmail(source) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to AI4Teachers</title>
</head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid rgba(26,26,46,0.08);overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.5px;">
        Welcome to AI4Teachers
      </h1>
      <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:8px 0 0;">
        Professional development that actually works
      </p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 40px 24px;">
      <p style="color:#1a1a2e;font-size:16px;line-height:1.7;margin:0 0 20px;">
        Thanks for signing up! You're joining a growing community of teachers learning to use AI effectively in the classroom &mdash; not as a gimmick, but as a real tool that saves time and improves teaching.
      </p>

      <!-- Free Course CTA -->
      <h2 style="color:#1a1a2e;font-size:18px;font-weight:700;margin:0 0 12px;">
        Start with the free course
      </h2>
      <p style="color:#4a4a5e;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong>Intro to AI for Teachers</strong> &mdash; 5 modules covering the RCTFC prompting framework, AI-connected teaching, customization, and building your own AI teaching toolkit. Self-paced. No jargon.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:8px 0 28px;">
            <a href="https://classroom.google.com/c/ODI1NTQ2NjYwNDYz?cjc=fp4iwvy"
               style="background:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:700;display:inline-block;">
              Join Free Course on Google Classroom &rarr;
            </a>
          </td>
        </tr>
      </table>

      <hr style="border:none;border-top:1px solid rgba(26,26,46,0.08);margin:0 0 24px;">

      <!-- Free Tools -->
      <h2 style="color:#1a1a2e;font-size:18px;font-weight:700;margin:0 0 12px;">
        Free AI teaching tools
      </h2>
      <p style="color:#4a4a5e;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Get 5 AI-powered commands (/plan, /rubric, /differentiate, /quiz, plus a bonus /sub-plan) that work inside Claude. Two-minute setup, no install required.
      </p>
      <a href="https://freeperiod.co/free-tools"
         style="color:#0d9488;font-weight:700;font-size:14px;text-decoration:underline;">
        Get your free tools &rarr;
      </a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 40px 32px;border-top:1px solid rgba(26,26,46,0.08);">
      <p style="color:#8888a0;font-size:12px;line-height:1.6;margin:0;text-align:center;">
        AI4Teachers &mdash; Professional development for the AI classroom.<br>
        <a href="https://ai4teachers.co" style="color:#1a1a2e;text-decoration:none;">ai4teachers.co</a>
        &nbsp;&middot;&nbsp;
        <a href="https://freeperiod.co" style="color:#0d9488;text-decoration:none;">freeperiod.co</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------- API handler ----------
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const data = JSON.parse(body);
    const email = data.email;
    const source = data.source || 'unknown';

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Submit to Google Forms for lead tracking (fire-and-forget)
    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScgwMboGki238NhxCjm2Xolbl_6CM5I4qo8jd7C8x4FoNdVbw/formResponse';
    const formData = new URLSearchParams();
    formData.append('entry.2116253119', email);
    formData.append('entry.1234567890', source);

    fetch(googleFormUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    }).catch(() => {
      console.log('Google Form submission failed for:', email);
    });

    // Send welcome email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Free Period <hello@freeperiod.co>',
            to: email,
            subject: 'Welcome to AI4Teachers — Start Your Free Course',
            html: buildWelcomeEmail(source),
          }),
        });

        if (!emailRes.ok) {
          const errBody = await emailRes.text();
          console.error('Resend error:', emailRes.status, errBody);
        } else {
          console.log('Welcome email sent to:', email);
        }
      } catch (emailErr) {
        console.error('Email send failed:', emailErr.message);
      }
    } else {
      console.log('RESEND_API_KEY not set — skipping email for:', email);
    }

    console.log('=== AI4TEACHERS SIGNUP ===');
    console.log('Email:', email);
    console.log('Source:', source);
    console.log('Time:', new Date().toISOString());
    console.log('=========================');

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Signup error:', error.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
