'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type OrganizationMembership = {
  role: string;
  organization: { id: string; name: string; slug: string } | null;
};

type OrganizationMember = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
};

async function fetchOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const response = await fetch(`/api/organizations/${organizationId}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load organization members.');
  return data.members ?? [];
}

export default function SettingsPage() {
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [organizationLoadError, setOrganizationLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberFullName, setMemberFullName] = useState('');
  const [memberRole, setMemberRole] = useState('qa_engineer');
  const [addingMember, setAddingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState('');
  const [memberError, setMemberError] = useState('');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [deactivatingUserId, setDeactivatingUserId] = useState('');
  const [memberToDeactivate, setMemberToDeactivate] = useState<OrganizationMember | null>(null);
  const deactivationDialogRef = useRef<HTMLDialogElement>(null);

  const selectedMembership = memberships.find((item) => item.organization?.id === selectedOrgId);
  const org = selectedMembership?.organization ?? null;
  const canManageMembers = selectedMembership?.role === 'org_admin' || selectedMembership?.role === 'super_admin';

  useEffect(() => {
    let active = true;
    fetch('/api/organizations', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load organization settings.');
        return data;
      })
      .then((data) => {
        if (!active) return;
        const available = (data.organizations ?? []).filter((item: OrganizationMembership) => item.organization) as OrganizationMembership[];
        setMemberships(available);
        const first = available[0];
        if (first?.organization) {
          setSelectedOrgId(first.organization.id);
          setOrgName(first.organization.name);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setOrganizationLoadError(loadError instanceof Error ? loadError.message : 'Could not load organization settings.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedOrgId || !canManageMembers) {
      setMembers([]);
      setMembersError('');
      return;
    }

    let active = true;
    setMembersLoading(true);
    setMembersError('');
    fetchOrganizationMembers(selectedOrgId)
      .then((items) => { if (active) setMembers(items); })
      .catch((loadError: unknown) => {
        if (active) setMembersError(loadError instanceof Error ? loadError.message : 'Could not load organization members.');
      })
      .finally(() => { if (active) setMembersLoading(false); });

    return () => { active = false; };
  }, [selectedOrgId, canManageMembers]);

  useEffect(() => {
    const dialog = deactivationDialogRef.current;
    if (!dialog) return;

    if (memberToDeactivate && !dialog.open) dialog.showModal();
    if (!memberToDeactivate && dialog.open) dialog.close();
  }, [memberToDeactivate]);

  const handleOrganizationChange = (organizationId: string) => {
    setSelectedOrgId(organizationId);
    const next = memberships.find((item) => item.organization?.id === organizationId)?.organization;
    setOrgName(next?.name ?? '');
    setSaved(false);
    setSettingsError('');
    setMemberMessage('');
    setMemberError('');
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!org) return;
    setSaving(true);
    setSaved(false);
    setSettingsError('');

    try {
      const response = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: orgName }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save organization settings.');
      setMemberships((current) => current.map((item) => item.organization?.id === org.id
        ? { ...item, organization: { ...item.organization, name: orgName } }
        : item
      ));
      setSaved(true);
    } catch (saveError: unknown) {
      setSettingsError(saveError instanceof Error ? saveError.message : 'Failed to save organization settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!org) return;
    setAddingMember(true);
    setMemberError('');
    setMemberMessage('');

    try {
      const response = await fetch(`/api/organizations/${org.id}`, {
        method: 'POST',
        body: JSON.stringify({ email: memberEmail, fullName: memberFullName, role: memberRole }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add this user.');

      setMemberMessage(data.invitationSent
        ? `Invitation sent to ${memberEmail.trim()}. They can confirm their email and set a password from the link.`
        : `${memberEmail.trim()} now has access to ${org.name}.`);
      setMemberEmail('');
      setMemberFullName('');
      setMembers(await fetchOrganizationMembers(org.id));
    } catch (addError: unknown) {
      setMemberError(addError instanceof Error ? addError.message : 'Could not add this user.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeactivate = async (member: OrganizationMember) => {
    if (!org) return;
    setMemberError('');
    setMemberToDeactivate(member);
  };

  const confirmDeactivate = async () => {
    const member = memberToDeactivate;
    if (!org || !member) return;
    setDeactivatingUserId(member.userId);
    setMemberError('');
    setMemberMessage('');
    try {
      const response = await fetch(`/api/organizations/${org.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: member.userId }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not deactivate this user.');
      setMembers((current) => current.filter((item) => item.userId !== member.userId));
      setMemberMessage(`${member.email} no longer has access to ${org.name}.`);
      setMemberToDeactivate(null);
    } catch (deactivateError: unknown) {
      setMemberError(deactivateError instanceof Error ? deactivateError.message : 'Could not deactivate this user.');
    } finally {
      setDeactivatingUserId('');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>
              <p className="mt-2 text-sm text-muted-foreground">Manage your organization details and access.</p>
            </div>

            {loading ? (
              <div className="text-muted-foreground">Loading settings...</div>
            ) : organizationLoadError ? (
              <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
                <p>{organizationLoadError}</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-md border border-red-400/40 px-3 py-1.5 hover:bg-red-500/10">Try again</button>
              </div>
            ) : memberships.length === 0 ? (
              <div className="bg-secondary border border-border rounded-lg p-6 text-muted-foreground">No organization found. Create an organization before managing settings.</div>
            ) : (
              <>
                {memberships.length > 1 && (
                  <div>
                    <label htmlFor="settings-organization" className="block text-sm font-medium text-foreground mb-2">Organization</label>
                    <select id="settings-organization" value={selectedOrgId} onChange={(event) => handleOrganizationChange(event.target.value)} className="w-full max-w-xl px-4 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      {memberships.map((item) => item.organization && <option key={item.organization.id} value={item.organization.id}>{item.organization.name}</option>)}
                    </select>
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-6 bg-secondary border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-foreground">Organization details</h2>
                  <div>
                    <label htmlFor="organization-name" className="block text-sm font-medium text-foreground mb-2">Organization Name</label>
                    <input id="organization-name" type="text" value={orgName} onChange={(event) => { setOrgName(event.target.value); setSaved(false); }} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Subscription Plan</label>
                    <div className="p-4 bg-background border border-border rounded-md flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Enterprise QA Tier</p>
                        <p className="text-xs text-muted-foreground mt-1">Unlimited projects, requirements, and test runs with AI assistant</p>
                      </div>
                      <span className="text-xs px-3 py-1 bg-primary text-white rounded-full">Active</span>
                    </div>
                  </div>
                  {settingsError && <p role="alert" className="text-sm text-red-500">{settingsError}</p>}
                  {saved && <p role="status" className="text-sm text-green-500">Settings saved successfully.</p>}
                  <button type="submit" disabled={saving || !orgName.trim()} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                </form>

                {canManageMembers ? (
                  <section className="space-y-5 bg-secondary border border-border rounded-lg p-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Users and access</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Invite a new person by email or add an existing account to this organization.</p>
                    </div>

                    <form onSubmit={handleAddMember} className="space-y-4 border-b border-border pb-6">
                      <div>
                        <label htmlFor="member-full-name" className="block text-sm font-medium text-foreground mb-2">Full name <span className="text-muted-foreground">(optional)</span></label>
                        <input id="member-full-name" type="text" value={memberFullName} onChange={(event) => setMemberFullName(event.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary" autoComplete="name" />
                      </div>
                      <div>
                        <label htmlFor="member-email" className="block text-sm font-medium text-foreground mb-2">Email address</label>
                        <input id="member-email" type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="teammate@example.com" required autoComplete="email" />
                      </div>
                      <div>
                        <label htmlFor="member-role" className="block text-sm font-medium text-foreground mb-2">Organization role</label>
                        <select id="member-role" value={memberRole} onChange={(event) => setMemberRole(event.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                          <option value="qa_engineer">QA Engineer</option>
                          <option value="qa_manager">QA Manager</option>
                          <option value="developer">Developer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      {memberError && <p role="alert" className="text-sm text-red-500">{memberError}</p>}
                      {memberMessage && <p role="status" className="text-sm text-green-500">{memberMessage}</p>}
                      <button type="submit" disabled={addingMember || !memberEmail.trim()} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm disabled:opacity-50">{addingMember ? 'Adding...' : 'Add or invite user'}</button>
                    </form>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">Organization members</h3>
                      {membersLoading ? (
                        <p className="text-sm text-muted-foreground">Loading members...</p>
                      ) : membersError ? (
                        <p role="alert" className="text-sm text-red-500">{membersError}</p>
                      ) : members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No members found.</p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {members.map((member) => (
                            <li key={member.userId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{member.fullName}</p>
                                <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">{member.role.replaceAll('_', ' ')}</span>
                                <button type="button" onClick={() => handleDeactivate(member)} disabled={deactivatingUserId === member.userId} className="rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                                  {deactivatingUserId === member.userId ? 'Deactivating...' : 'Deactivate'}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-3 text-xs text-muted-foreground">Deactivation removes access to this organization only. The person’s Supabase account and access to other organizations remain.</p>
                    </div>
                  </section>
                ) : (
                  <p className="text-sm text-muted-foreground">Only an organization admin can manage members.</p>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      <dialog
        ref={deactivationDialogRef}
        aria-labelledby="deactivation-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!deactivatingUserId) {
            setMemberError('');
            setMemberToDeactivate(null);
          }
        }}
        className="w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-secondary p-0 text-foreground shadow-2xl backdrop:bg-black/70"
      >
        {memberToDeactivate && (
          <div className="p-6">
            <h2 id="deactivation-dialog-title" className="text-xl font-semibold">Remove organization access?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">{memberToDeactivate.fullName || memberToDeactivate.email}</span>
              {' '}({memberToDeactivate.email}) will no longer be able to access <span className="font-medium text-foreground">{org?.name}</span>.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Their account will stay active, and access to their other organizations will not change.
            </p>
            {memberError && <p role="alert" className="mt-4 text-sm text-red-400">{memberError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setMemberError(''); setMemberToDeactivate(null); }}
                disabled={deactivatingUserId === memberToDeactivate.userId}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-background/70 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeactivate()}
                disabled={deactivatingUserId === memberToDeactivate.userId}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deactivatingUserId === memberToDeactivate.userId ? 'Deactivating...' : 'Deactivate user'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
