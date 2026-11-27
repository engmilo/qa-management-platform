'use client';
import { useEffect, useState } from 'react';

// Two-Factor Setup — Settings page
// Flow: Enable -> Show QR -> Enter code -> Show recovery codes once
// NEW: Disable -> Confirm -> DELETE /api/auth/2fa/disable
// Colors: Enable = GREEN (like Save Changes / Sign in), Disable = solid RED (destructive)
export default function TwoFactorSetup() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showConfirmDisable, setShowConfirmDisable] = useState(false);

  useEffect(() => {
    fetch('/api/auth/2fa/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setIsEnabled(!!j.is_enabled))
      .catch(() => setIsEnabled(false));
  }, []);

  const startSetup = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not start setup.');
      setQrCode(j.qrCode);
      setShowSetup(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start setup.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Invalid code.');
      setRecoveryCodes(j.recoveryCodes ?? []);
      setIsEnabled(true);
      setShowSetup(false);
      setQrCode('');
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/disable', { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not disable 2FA.');
      setIsEnabled(false);
      setShowConfirmDisable(false);
      setRecoveryCodes([]);
      setShowSetup(false);
      setQrCode('');
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  if (isEnabled === null) return <p className="text-xs text-slate-500">Loading 2FA status...</p>;

  return (
    <div className="border rounded-md p-4 bg-white dark:bg-[#182232] border-[#d8dee4] dark:border-[#28374d]">
      <h3 className="text-sm font-normal">Two-Factor Authentication (2FA)</h3>
      <p className="text-xs text-slate-500 mt-1">
        Status: {isEnabled ? 'Enabled ✅' : 'Disabled'}
      </p>

      {error && <div className="mt-3 p-2 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

      {!isEnabled && !showSetup && !recoveryCodes.length && (
        <button onClick={startSetup} disabled={loading} className="mt-3 bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-normal px-3 py-2 rounded">
          {loading ? 'Starting...' : 'Enable 2FA'}
        </button>
      )}

      {!isEnabled && showSetup && qrCode && (
        <div className="mt-4 space-y-3">
          <p className="text-xs">1. Scan this QR with Google / Microsoft Authenticator</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="2FA QR code" className="w-40 h-40 border rounded bg-white p-2" />
          <p className="text-xs">2. Enter the 6-digit code from your app</p>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" className="w-32 border rounded px-3 py-2 text-sm" />
          <div>
            <button onClick={verify} disabled={loading || code.length !== 6} className="bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-normal px-3 py-2 rounded">
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
          <p className="text-xs font-normal text-amber-800">Save these recovery codes — shown only once!</p>
          <p className="text-xs text-amber-700 mt-1">Use one if you lose your authenticator. Each code works once.</p>
          <div className="grid grid-cols-2 gap-1 mt-2 font-mono text-xs">
            {recoveryCodes.map((c) => (
              <span key={c} className="bg-white border rounded px-2 py-1">{c}</span>
            ))}
          </div>
          <button onClick={() => setRecoveryCodes([])} className="mt-3 text-xs bg-slate-800 text-white px-3 py-1.5 rounded">I saved them</button>
        </div>
      )}

      {isEnabled && !recoveryCodes.length && !showConfirmDisable && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-green-700">2FA is enabled. You will be asked for a code on login.</p>
          <button onClick={() => setShowConfirmDisable(true)} disabled={loading} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-normal px-3 py-2 rounded">
            Disable 2FA
          </button>
        </div>
      )}

      {isEnabled && showConfirmDisable && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded space-y-2">
          <p className="text-xs font-normal text-red-800 dark:text-red-300">Disable 2FA?</p>
          <p className="text-xs text-red-700 dark:text-red-400">You will no longer be asked for a code on login. Your recovery codes will stop working. You can re-enable it anytime.</p>
          <div className="flex gap-2">
            <button onClick={disable} disabled={loading} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-normal px-3 py-2 rounded">
              {loading ? 'Disabling...' : 'Yes, disable 2FA'}
            </button>
            <button onClick={() => setShowConfirmDisable(false)} disabled={loading} className="bg-white dark:bg-[#101622] border border-[#d8dee4] dark:border-[#28374d] text-xs font-normal px-3 py-2 rounded">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
