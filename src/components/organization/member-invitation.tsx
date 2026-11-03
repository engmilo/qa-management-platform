'use client';

import { useState } from 'react';

interface MemberInvitationProps {
  organizationId: string;
}

export function MemberInvitation({ organizationId }: MemberInvitationProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('qa_engineer');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Simulate invitation
    setTimeout(() => {
      setLoading(false);
      setMessage(`Invitation sent to ${email}`);
      setEmail('');
    }, 1000);
  };

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Invite Team Member</h3>
      
      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="colleague@company.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="qa_engineer">QA Engineer</option>
            <option value="qa_manager">QA Manager</option>
            <option value="developer">Developer</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {message && (
          <div className="text-sm text-green-500">{message}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>
    </div>
  );
}
