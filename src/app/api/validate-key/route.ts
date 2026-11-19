// src/app/api/validate-key/route.ts
// Test endpoint for TC-PROD-008 / TC-PROD-010
// GET /api/validate-key with header X-API-Key: qa_...
// 200 = valid, 401 = invalid / revoked
import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-key-auth';

export async function GET(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ valid: false, error: auth.error }, { status: 401 });
  }
  return NextResponse.json({
    valid: true,
    organization_id: auth.organization_id,
    key_name: auth.apiKey?.name,
    key_prefix: auth.apiKey?.key_prefix,
  });
}
