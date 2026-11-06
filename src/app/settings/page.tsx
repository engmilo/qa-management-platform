'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type OrganizationMembership = {
  role: string;
  organization: { id: string; name: string; slug: string } | null;
};

export default function SettingsPage() {
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('qa_engineer');
  const [addingMember, setAddingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState('');
  const [memberError, setMemberError] = useState('');

  const selectedMembership = memberships.find((item) => item.organization?.id === selectedOrgId);
  const org = selectedMembership?.organization ?? null;
  const canManageMembers = selectedMembership?.role === 'org_admin' || selectedMembership?.role === 'super_admin';

  useEffect(() => {
    let active = true;

    fetch('/api/organizations')
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
        if (active) setSettingsError(loadError instanceof Error ? loadError.message : 'Could not load organization settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

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
        body: JSON.stringify({ email: memberEmail, role: memberRole }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add this member.');

      setMemberMessage(`${memberEmail.trim()} can now access ${org.name}.`);
      setMemberEmail('');
    } catch (addError: unknown) {
      setMemberError(addError instanceof Error ? addError.message : 'Could not add this member.');
    } finally {
      setAddingMember(false);
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
            ) : memberships.length === 0 ? (
              <div className="bg-secondary border border-border rounded-lg p-6 text-muted-foreground">
                No organization found. Create an organization before managing settings.
              </div>
            ) : (
              <>
                {memberships.length > 1 && (
                  <div>
                    <label htmlFor="settings-organization" className="block text-sm font-medium text-foreground mb-2">Organization</label>
                    <select
                      id="settings-organization"
                      value={selectedOrgId}
                      onChange={(event) => handleOrganizationChange(event.target.value)}
                      className="w-full max-w-xl px-4 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {memberships.map((item) => item.organization && (
                        <option key={item.organization.id} value={item.organization.id}>{item.organization.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-6 bg-secondary border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-foreground">Organization details</h2>
                  <div>
                    <label htmlFor="organization-name" className="block text-sm font-medium text-foreground mb-2">Organization Name</label>
                    <input
                      id="organization-name"
                      type="text"
                      value={orgName}
                      onChange={(event) => { setOrgName(event.target.value); setSaved(false); }}
                      className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
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

                  <button
                    type="submit"
                    disabled={saving || !orgName.trim()}
                    className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>

                {canManageMembers ? (
                  <section className="space-y-5 bg-secondary border border-border rounded-lg p-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Add an existing account</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add someone who already registered. They will then see this organization in the project form.
                      </p>
                    </div>
                    <form onSubmit={handleAddMember} className="space-y-4">
                      <div>
                        <label htmlFor="member-email" className="block text-sm font-medium text-foreground mb-2">Account email</label>
                        <input
                          id="member-email"
                          type="email"
                          value={memberEmail}
                          onChange={(event) => setMemberEmail(event.target.value)}
                          className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="teammate@example.com"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="member-role" className="block text-sm font-medium text-foreground mb-2">Role</label>
                        <select
                          id="member-role"
                          value={memberRole}
                          onChange={(event) => setMemberRole(event.target.value)}
                          className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="qa_engineer">QA Engineer</option>
                          <option value="qa_manager">QA Manager</option>
                          <option value="developer">Developer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      {memberError && <p role="alert" className="text-sm text-red-500">{memberError}</p>}
                      {memberMessage && <p role="status" className="text-sm text-green-500">{memberMessage}</p>}
                      <button
                        type="submit"
                        disabled={addingMember || !memberEmail.trim()}
                        className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm disabled:opacity-50"
                      >
                        {addingMember ? 'Adding...' : 'Add Member'}
                      </button>
                    </form>
                  </section>
                ) : (
                  <p className="text-sm text-muted-foreground">Only an organization admin can add members.</p>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
