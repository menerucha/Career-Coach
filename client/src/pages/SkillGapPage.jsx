import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField, PageHeader, ScenarioPicker, TagInput } from '@/components/common.jsx';
import { AnalysisResult, compact } from '@/components/AnalysisShell.jsx';
import { SkillGapReport } from '@/components/reports.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { useMe } from '@/lib/MeContext.jsx';
import { useAction } from '@/hooks/useAsync.js';

export default function SkillGapPage() {
  const api = useApi(), { me, setQuota } = useMe();
  const [f, setF] = useState({ targetRole: '', currentSkills: [], experienceLevel: 'mid', jobDescription: '', scenario: '' });
  const [local, setLocal] = useState({});
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {                                   // prefill from the saved profile once
    if (prefilled || !me?.profile) return;
    setF((s) => ({ ...s, targetRole: s.targetRole || me.profile.targetRole || '', currentSkills: s.currentSkills.length ? s.currentSkills : me.profile.skills || [], experienceLevel: me.profile.experienceLevel || s.experienceLevel })); setPrefilled(true);
  }, [me, prefilled]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const { run, loading, error, data } = useAction(() => api.analyze('skill-gap', compact(f)));
  const errs = { ...local, ...(error?.status === 400 ? error.fields : {}) };
  async function submit(e) {
    e.preventDefault();
    const v = {}; if (f.targetRole.trim().length < 2) v.targetRole = 'Target role must be at least 2 characters'; if (!f.currentSkills.length) v.currentSkills = 'Add at least one skill';
    setLocal(v); if (Object.keys(v).length) return;
    const d = await run(); if (d) { setQuota(d.quota); toast.success('Skill-gap analysis saved'); }
  }
  return (
    <div>
      <PageHeader title="Skill-gap analysis" description="Compare your skills with what your target role typically requires and get a prioritised learning list." />
      <Card><CardContent className="p-5"><form onSubmit={submit} className="space-y-5" noValidate>
        <FormField id="scenario" label="Your situation" optional><ScenarioPicker value={f.scenario} onChange={(id, sc) => setF((s) => ({ ...s, scenario: id, ...(sc && { experienceLevel: sc.defaults.experienceLevel }) }))} /></FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="targetRole" label="Target role" error={errs.targetRole}><Input id="targetRole" aria-invalid={!!errs.targetRole} value={f.targetRole} onChange={set('targetRole')} placeholder="e.g. Data Analyst" maxLength={100} /></FormField>
          <FormField id="experienceLevel" label="Experience level"><Select id="experienceLevel" value={f.experienceLevel} onChange={set('experienceLevel')}><option value="entry">Entry level</option><option value="mid">Mid level</option><option value="senior">Senior</option></Select></FormField>
        </div>
        <FormField id="currentSkills" label="Your current skills" hint="Enter or comma to add" error={errs.currentSkills || errs['currentSkills.0']}><TagInput id="currentSkills" value={f.currentSkills} onChange={(v) => setF((s) => ({ ...s, currentSkills: v }))} aria-invalid={!!errs.currentSkills} /></FormField>
        <FormField id="jobDescription" label="Job description" optional><Textarea id="jobDescription" value={f.jobDescription} onChange={set('jobDescription')} placeholder="Paste a posting to compare against its requirements…" maxLength={8000} /></FormField>
        <Button type="submit" disabled={loading}>{loading ? 'Analysing…' : 'Analyse skill gap'}</Button>
      </form></CardContent></Card>
      <AnalysisResult loading={loading} error={error} data={data} onRetry={run}>{data && <SkillGapReport output={data.report.output} />}</AnalysisResult>
    </div>
  );
}
