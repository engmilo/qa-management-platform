'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Building2, UserPlus, Users, CheckCircle2 } from 'lucide-react';

type OrganizationMembership = {
  role: string;
  organization: { id: string; name: string; slug: string } | null;
};

type OrganizationMember = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isCurrentUser: boolean;
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
  const [memberRole, setMemberRole] = useState('qa_engineer');
  const [addingMember, setAddingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState('');
  const [memberError, setMemberError] = useState('');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [memberToDeactivate, setMemberToDeactivate] = useState<OrganizationMember | null>(null);
  const [deactivatingUserId, setDeactivatingUserId] = useState('');
  const [deactivationError, setDeactivationError] = useState('');
  const [deactivationMessage, setDeactivationMessage] = useState('');
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
        const available = (data.organizations ?? []).filter(
          (item: OrganizationMembership) => item.organization
        ) as OrganizationMembership[];
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
      .finally(() => {
        if (active) setLoading(false);
      });

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
    setDeactivationMessage('');
    setDeactivationError('');
    setMemberToDeactivate(null);
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
        body: JSON.stringify({ email: memberEmail, role: memberRole }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add this member.');

      setMemberMessage(`${memberEmail.trim()} can now access ${org.name}.`);
      setMemberEmail('');
      setMembers(await fetchOrganizationMembers(org.id));
    } catch (addError: unknown) {
      setMemberError(addError instanceof Error ? addError.message : 'Could not add this member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeactivate = (member: OrganizationMember) => {
    setDeactivationError('');
    setDeactivationMessage('');
    setMemberToDeactivate(member);
  };

  const confirmDeactivate = async () => {
    const member = memberToDeactivate;
    if (!org || !member) return;

    setDeactivatingUserId(member.userId);
    setDeactivationError('');
    setDeactivationMessage('');
    try {
      const response = await fetch(`/api/organizations/${org.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: member.userId }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not deactivate this user.');

      setMembers((current) => current.filter((item) => item.userId !== member.userId));
      setDeactivationMessage(`${member.email} no longer has access to ${org.name}.`);
      setMemberToDeactivate(null);
    } catch (error: unknown) {
      setDeactivationError(error instanceof Error ? error.message : 'Could not deactivate this user.');
    } finally {
      setDeactivatingUserId('');
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl space-y-6">
            <div className="pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Organization Settings</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage your team workspace profile, permissions, and members</p>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                Loading settings...
              </div>
            ) : organizationLoadError ? (
              <div role="alert" className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md text-xs font-medium">
                <p>{organizationLoadError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 btn-testrail-secondary text-xs"
                >
                  Try again
                </button>
              </div>
            ) : memberships.length === 0 ? (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                No organization found. Create an organization before managing settings.
              </div>
            ) : (
              <>
                {memberships.length > 1 && (
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4 shadow-sm flex items-center justify-between gap-4">
                    <label htmlFor="settings-organization" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 shrink-0">
                      Active Organization:
                    </label>
                    <select
                      id="settings-organization"
                      value={selectedOrgId}
                      onChange={(event) => handleOrganizationChange(event.target.value)}
                      className="w-full max-w-md px-3 py-1.5 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48a43f]"
                    >
                      {memberships.map((item) => item.organization && (
                        <option key={item.organization.id} value={item.organization.id}>{item.organization.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Organization Details Form */}
                <form onSubmit={handleSave} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                  <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#276fbf] dark:text-[#4da3ff]" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Organization Profile</h2>
                  </div>

                  <div className="p-6 space-y-5">
                    <div>
                      <label htmlFor="organization-name" className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300 — and remove the duplicate tracking-wider mb-1.5 that follows if your file already has it tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">
                        Organization Name <span className="text-red-500"> *</span>
                      </label>
                      <input
                        id="organization-name"
                        type="text"
                        value={orgName}
                        onChange={(event) => { setOrgName(event.target.value); setSaved(false); }}
                        className="w-full px-3 py-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300 — and remove the duplicate tracking-wider mb-1.5 that follows if your file already has it tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Subscription Plan</label>
                      <div className="p-4 bg-[#f8fafc] dark:bg-[#141d28] border border-[#d8dee4] dark:border-[#28374d] rounded-md flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Enterprise QA Tier</p>
                          <p className="text- text-slate-500 dark:text-slate-400 mt-0.5">Unlimited test repositories, suites, executions, and AI assistant access</p>
                        </div>
                        <span className="text- font-semibold px-2.5 py-0.5 bg-[#dff0d8] dark:bg-[#132c1c] text-[#3c763d] dark:text-[#52c41a] border border-[#d6e9c6] dark:border-[#1d4c2b] rounded-full">
                          Active License
                        </span>
                      </div>
                    </div>

                    {settingsError && <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-medium">{settingsError}</p>}
                    {saved && (
                      <p role="status" className="text-xs text-[#2e7d32] dark:text-[#52c41a] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Settings saved successfully.
                      </p>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={saving || !orgName.trim()}
                        className="btn-testrail-primary"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Team Members Management */}
                {canManageMembers ? (
                  <section className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                    <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#48a43f]" />
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Team &amp; Access Control</h2>
                    </div>

                    <div className="p-6 space-y-6">
                      <form onSubmit={handleAddMember} className="space-y-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Invite or add registered users to this organization by email address.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label htmlFor="member-email" className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300 — and remove the duplicate tracking-wider mb-1.5 that follows if your file already has it tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Account email</label>
                            <input
                              id="member-email"
                              type="email"
                              value={memberEmail}
                              onChange={(event) => setMemberEmail(event.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                              placeholder="teammate@company.com"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="member-role" className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300 — and remove the duplicate tracking-wider mb-1.5 that follows if your file already has it tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Role</label>
                            <select
                              id="member-role"
                              value={memberRole}
                              onChange={(event) => setMemberRole(event.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48a43f]"
                            >
                              <option value="qa_engineer">QA Engineer</option>
                              <option value="qa_manager">QA Manager</option>
                              <option value="developer">Developer</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                        </div>

                        {memberError && <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-medium">{memberError}</p>}
                        {memberMessage && (
                          <p role="status" className="text-xs text-[#2e7d32] dark:text-[#52c41a] font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> {memberMessage}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={addingMember || !memberEmail.trim()}
                          className="btn-testrail-primary"
                        >
                          {addingMember ? 'Adding...' : 'Add Member'}
                        </button>
                      </form>

                      {/* Member list table */}
                      <div className="border-t border-[#edf2f7] dark:border-[#222e3e] pt-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3">Active Organization Members</h3>
                        {deactivationMessage && (
                          <p role="status" className="mb-3 text-xs text-[#2e7d32] dark:text-[#52c41a] font-semibold">{deactivationMessage}</p>
                        )}
                        {membersLoading ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500">Loading members...</p>
                        ) : membersError ? (
                          <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-medium">{membersError}</p>
                        ) : members.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500">No members found.</p>
                        ) : (
                          <div className="border border-[#d8dee4] dark:border-[#28374d] rounded overflow-hidden">
                            <ul className="divide-y divide-[#edf2f7] dark:divide-[#222e3e]">
                              {members.map((member) => (
                                <li key={member.userId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-[#f8fafc] dark:hover:bg-[#1f2c3f] transition-colors">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{member.fullName}</p>
                                    <p className="text- text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-normal px-2 py-0.5 rounded-full capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                      {member.role.replaceAll('_', ' ')}
                                    </span>
                                    {member.isCurrentUser ? (
                                      <span className="text- font-semibold text-[#276fbf] dark:text-[#4da3ff]">You</span>
                                    ) : member.role === 'org_admin' || member.role === 'super_admin' ? (
                                      <span className="text- text-slate-400 dark:text-slate-500 italic">Admin protected</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleDeactivate(member)}
                                        disabled={deactivatingUserId === member.userId}
                                        className="text- text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium hover:underline disabled:opacity-50"
                                      >
                                        {deactivatingUserId === member.userId ? 'Deactivating...' : 'Deactivate'}
                                      </button>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">Only an organization admin can add or manage team members.</p>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Deactivation Dialog */}
      <dialog
        ref={deactivationDialogRef}
        aria-labelledby="deactivation-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!deactivatingUserId) {
            setDeactivationError('');
            setMemberToDeactivate(null);
          }
        }}
        className="w-[calc(100%-2rem)] max-w-md rounded-md border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#182232] p-6 text-slate-900 dark:text-slate-100 shadow-2xl backdrop:bg-black/50"
      >
        {memberToDeactivate && (
          <div>
            <h2 id="deactivation-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">Remove Member Access?</h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-slate-900 dark:text-white">{memberToDeactivate.fullName || memberToDeactivate.email}</span> ({memberToDeactivate.email}) will no longer be able to access <span className="font-semibold text-slate-900 dark:text-white">{org?.name}</span>.
            </p>
            {deactivationError && <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">{deactivationError}</p>}
            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-[#edf2f7] dark:border-[#222e3e]">
              <button
                type="button"
                onClick={() => { setDeactivationError(''); setMemberToDeactivate(null); }}
                disabled={deactivatingUserId === memberToDeactivate.userId}
                className="btn-testrail-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeactivate()}
                disabled={deactivatingUserId === memberToDeactivate.userId}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm disabled:opacity-50"
              >
                {deactivatingUserId === memberToDeactivate.userId ? 'Deactivating...' : 'Deactivate Member'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}