import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorAlert, FormField, PageHeader, TagInput } from '@/components/common.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { useMe } from '@/lib/MeContext.jsx';
import { useAction } from '@/hooks/useAsync.js';

export default function ProfilePage() {
  const api = useApi(), { me, reload } = useMe();
  const [f, setF] = useState({ targetRole: '', experienceLevel: 'mid', skills: [] });
  useEffect(() => { if (me?.profile) setF({ targetRole: me.profile.targetRole || '', experienceLevel: me.profile.experienceLevel || 'mid', skills: me.profile.skills || [] }); }, [me?.profile]);
  const { run, loading, error } = useAction(() => api.updateProfile(f));
  async function save(e) { e.preventDefault(); const d = await run(); if (d) { toast.success('Profile saved'); reload(); } }
  return (
    <div className="max-w-2xl">
      <PageHeader title="Your profile" description="Saved to your account and used to pre-fill the skill-gap form." />
      <Card><CardContent className="p-5"><form onSubmit={save} className="space-y-5">
        <FormField id="targetRole" label="Target role" error={error?.fields?.targetRole}><Input id="targetRole" value={f.targetRole} onChange={(e) => setF((s) => ({ ...s, targetRole: e.target.value }))} maxLength={100} placeholder="e.g. Data Analyst" /></FormField>
        <FormField id="experienceLevel" label="Experience level"><Select id="experienceLevel" value={f.experienceLevel} onChange={(e) => setF((s) => ({ ...s, experienceLevel: e.target.value }))}><option value="entry">Entry level</option><option value="mid">Mid level</option><option value="senior">Senior</option></Select></FormField>
        <FormField id="skills" label="Skills" hint="Enter or comma to add"><TagInput id="skills" value={f.skills} onChange={(skills) => setF((s) => ({ ...s, skills }))} /></FormField>
        <ErrorAlert error={error} /><Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save profile'}</Button>
      </form></CardContent></Card>
    </div>
  );
}
