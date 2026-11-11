import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = (body.message ?? body.prompt ?? '').toString().trim();
    if (!message) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });

    const q = message.toLowerCase();
    const supabase = getSupabase();

    // Summarize defects
    if (q.includes('defect')) {
      const { data: defects } = await supabase.from('defects').select('defect_key, summary, status, severity, priority').order('created_at', { ascending: false }).limit(10);
      const list = defects ?? [];
      const open = list.filter((d: any) => ['new', 'open', 'in_progress', 'reopened'].includes((d.status || '').toLowerCase()));
      const lines = list.slice(0, 5).map((d: any) => `• ${d.defect_key} — ${d.summary} [${d.status} / ${d.severity}]`).join('\n');
      return NextResponse.json({
        reply: `Open defects summary:\n\nTotal fetched: ${list.length}\nOpen / In Progress: ${open.length}\n\nTop defects:\n${lines || 'No defects found.'}\n\nTip: Fix Critical + High first, then retest.`,
      });
    }

    // Summarize runs
    if (q.includes('run') || q.includes('result')) {
      const { data: runs } = await supabase.from('test_runs').select('name, status').order('created_at', { ascending: false }).limit(10);
      const list = runs ?? [];
      const completed = list.filter((r: any) => (r.status || '').toLowerCase() === 'completed').length;
      const lines = list.map((r: any) => `• ${r.name} — ${r.status}`).join('\n');
      return NextResponse.json({
        reply: `Test Runs summary:\n\nTotal fetched: ${list.length}\nCompleted: ${completed}\n\nRecent runs:\n${lines || 'No test runs found.'}`,
      });
    }

    // Test cases for login / 2FA
    if (q.includes('test case') && (q.includes('login') || q.includes('2fa') || q.includes('auth') || q.includes('otp'))) {
      return NextResponse.json({
        reply: `Test cases for Login with 2FA (OTP):\n\n1. Valid login + valid OTP — Enter valid email/password, enter correct 6-digit OTP within expiry. Expected: Login succeeds, dashboard loads.\n2. Valid login + wrong OTP — Enter wrong OTP. Expected: Error "Invalid code", retry allowed.\n3. Valid login + expired OTP — Wait for OTP expiry, then enter old code. Expected: Error "Code expired", Resend option shown.\n4. Valid login + empty OTP — Submit without code. Expected: Validation "OTP is required".\n5. Resend OTP — Click Resend. Expected: New OTP sent, old OTP invalidated.\n6. Too many attempts — Enter wrong OTP 5 times. Expected: Account temporarily locked / cooldown.\n7. OTP with spaces / letters — Enter "12 34ab". Expected: Only digits accepted, validation error.`,
      });
    }

    // Test plan for checkout
    if (q.includes('test plan') && q.includes('checkout')) {
      return NextResponse.json({
        reply: `Test Plan — Checkout:\n\nScope: Cart, checkout form, payment, order confirmation, email receipt.\nOut of scope: Admin refunds, inventory backend.\n\nTest types: Functional, regression, UI, API, performance (checkout under load).\n\nSuites:\n1. Cart & Promo codes\n2. Checkout form validation (address, email, phone)\n3. Payment (card, PayPal, failed payment, 3D Secure)\n4. Order confirmation & receipt\n5. Edge cases (empty cart, expired session, double submit)\n\nEntry criteria: Build deployed, test data ready.\nExit criteria: 95% cases passed, no Critical defects open.`,
      });
    }

    // Generic test cases
    if (q.includes('test case')) {
      return NextResponse.json({
        reply: `Here is a test case template you can copy:\n\nTitle: [Feature] — [Action] — [Expected]\nPreconditions: User logged in, test data ready.\nSteps:\n1. Go to [page]\n2. Enter [valid data]\n3. Click [Submit]\nExpected: [Success message / page loads]\n\nTell me the feature — e.g. "Write test cases for login with 2FA" or "for checkout payment" — and I will generate the full list.`,
      });
    }

    // Fallback — still useful, no error
    return NextResponse.json({
      reply: `I can help with:\n\n• "Write test cases for login with 2FA"\n• "Summarize open defects for this week"\n• "Draft a test plan for checkout"\n• "Summarize test runs"\n\nTry one of those, or tell me the feature you are testing.`,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not generate reply.' }, { status: 500 });
  }
}