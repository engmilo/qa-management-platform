// src/lib/api-key-auth.ts — v3 with scopes
// REQ-PROD-002 TC-PROD-010 — returns scopes so Delete Suite can enforce 403
import { createHash } from 'crypto';

export async function validateApiKey(req: Request) {
  const header = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || '';
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const key = (header || bearer || '').trim();
  if (!key || !key.startsWith('qa_')) {
    return { valid: false, organization_id: null, apiKey: null, scopes: [] as string[], error: 'Missing API key' };
  }
  const keyHash = createHash('sha256').update(key).digest('hex');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    return { valid: false, organization_id: null, apiKey: null, scopes: [] as string[], error: 'Server missing Supabase config' };
  }
  // Include scopes in select — needed for TC-PROD-010
  const res = await fetch(`${url}/rest/v1/api_keys?key_hash=eq.${keyHash}&is_active=eq.true&revoked_at=is.null&revoked_at=is.null&select=id,organization_id,name,key_prefix,scopes,is_active,created_by_email`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: 'no-store',
  });
  if (!res.ok) return { valid: false, organization_id: null, apiKey: null, scopes: [] as string[], error: 'Invalid or revoked API key' };
  const rows = await res.json().catch(() => []);
  const data = rows?.[0];
  if (!data) return { valid: false, organization_id: null, apiKey: null, scopes: [] as string[], error: 'Invalid or revoked API key' };
  fetch(`${url}/rest/v1/api_keys?id=eq.${data.id}`, {
    method: 'PATCH',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ last_used_at: new Date().toISOString() }),
  }).catch(() => {});
  return { valid: true, organization_id: data.organization_id, apiKey: data, scopes: (data.scopes || []) as string[], error: null };
}

// Helper: does this key have the required scope?
export function hasScope(scopes: string[], required: string) {
  return scopes.includes(required) || scopes.includes('*') || scopes.includes('admin');
}
