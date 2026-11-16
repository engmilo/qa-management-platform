import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function callClaude(userMessage: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server. Add it to .env.local and Vercel, then restart.');
  const models = ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001', 'claude-opus-4-1-20250805'];
  let lastError = '';
  for (const model of models) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const text = data?.content?.[0]?.text || '';
      if (!text) throw new Error('Claude returned no text.');
      return text;
    }
    lastError = data?.error ? `${data.error.type || 'error'}: ${data.error.message || JSON.stringify(data.error)} (model ${model}, status ${res.status})` : `Claude API error: ${res.status} for model ${model}`;
    // Only fallback on model-not-found / not-available errors
    if (!/model|not found|not available|does not exist/i.test(lastError)) break;
  }
  throw new Error(lastError || 'Claude API error.');
}

const QA_SYSTEM = `You are a QA assistant inside a QA Management Platform (Zamir Oy).
Help with test cases, test plans, test runs summaries, and defect drafts.
Be concrete, structured, and testable. Use Title Case for statuses/priorities.
For test cases always include: Title, Preconditions, Steps (numbered), Expected Result.
Never invent defect IDs, test run names, or requirement keys that were not given to you.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = (body.message ?? body.prompt ?? '').toString().trim();
    if (!message) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });

    const q = message.toLowerCase();
    const supabase = getSupabase();

    // Summarize defects — real DB data + Claude summarizes it
    if (q.includes('defect')) {
      const { data: defects } = await supabase.from('defects').select('defect_key, summary, status, severity, priority').order('created_at', { ascending: false }).limit(10);
      const list = defects ?? [];
      const context = list.map((d: any) => `- ${d.defect_key} — ${d.summary} [status=${d.status} severity=${d.severity} priority=${d.priority}]`).join('\n') || 'No defects found.';
      const reply = await callClaude(
        `Summarize these open defects for this week. Group by severity, call out Critical/High first, suggest what to fix/retest first.\n\nDefects (real data from DB):\n${context}\n\nUser request: ${message}`,
        QA_SYSTEM
      );
      return NextResponse.json({ reply });
    }

    // Summarize runs — real DB data + Claude summarizes it
    if (q.includes('run') || q.includes('result')) {
      const { data: runs } = await supabase.from('test_runs').select('name, status').order('created_at', { ascending: false }).limit(10);
      const list = runs ?? [];
      const context = list.map((r: any) => `- ${r.name} — ${r.status}`).join('\n') || 'No test runs found.';
      const reply = await callClaude(
        `Summarize these test runs. Total, how many Completed, recent trend, what to do next.\n\nTest Runs (real data from DB):\n${context}\n\nUser request: ${message}`,
        QA_SYSTEM
      );
      return NextResponse.json({ reply });
    }

    // Everything else — direct Claude call (test cases, test plans, generic)
    const reply = await callClaude(message, QA_SYSTEM);
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not generate reply.' }, { status: 500 });
  }
}
