import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField, PageHeader, ScenarioPicker } from '@/components/common.jsx';
import { AnalysisResult, compact } from '@/components/AnalysisShell.jsx';
import { RoadmapReport } from '@/components/reports.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { useMe } from '@/lib/MeContext.jsx';
import { useAction } from '@/hooks/useAsync.js';

export default function RoadmapPage() {
  const api = useApi(), { setQuota } = useMe();
  const [f, setF] = useState({ currentBackground: '', targetRole: '', timeframeMonths: 6, hoursPerWeek: 10, learningStyle: 'mixed', scenario: '' });
  const [local, setLocal] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const body = () => compact({ ...f, timeframeMonths: Number(f.timeframeMonths), hoursPerWeek: Number(f.hoursPerWeek) });
  const { run, loading, error, data } = useAction(() => api.analyze('roadmap', body()));
  const errs = { ...local, ...(error?.status === 400 ? error.fields : {}) };
  async function submit(e) {
    e.preventDefault();
    const v = {}; if (f.currentBackground.trim().length < 10) v.currentBackground = 'Describe your background in at least 10 characters'; if (f.targetRole.trim().length < 2) v.targetRole = 'Target role must be at least 2 characters';
    const h = Number(f.hoursPerWeek); if (!Number.isInteger(h) || h < 1 || h > 60) v.hoursPerWeek = 'Enter 1-60 hours per week';
    setLocal(v); if (Object.keys(v).length) return;
    const d = await run(); if (d) { setQuota(d.quota); toast.success('Roadmap saved'); }
  }
  return (
    <div>
      <PageHeader title="Career roadmap" description="A phased, time-boxed learning plan from where you are to the role you want." />
      <Card><CardContent className="p-5"><form onSubmit={submit} className="space-y-5" noValidate>
        <FormField id="scenario" label="Your situation" optional><ScenarioPicker value={f.scenario} onChange={(id, sc) => setF((s) => ({ ...s, scenario: id, ...(sc && { timeframeMonths: sc.defaults.timeframeMonths, hoursPerWeek: sc.defaults.hoursPerWeek }) }))} /></FormField>
        <FormField id="currentBackground" label="Your current background" hint={`${f.currentBackground.trim().length}/1500`} error={errs.currentBackground}><Textarea id="currentBackground" aria-invalid={!!errs.currentBackground} value={f.currentBackground} onChange={set('currentBackground')} maxLength={1500} placeholder="Current job, education, skills you already use, anything relevant…" /></FormField>
        <div className="grid gap-4 md:grid-cols-4">
          <FormField id="targetRole" label="Target role" error={errs.targetRole}><Input id="targetRole" aria-invalid={!!errs.targetRole} value={f.targetRole} onChange={set('targetRole')} placeholder="e.g. Product Manager" maxLength={100} /></FormField>
          <FormField id="timeframeMonths" label="Timeframe"><Select id="timeframeMonths" value={f.timeframeMonths} onChange={set('timeframeMonths')}>{[3, 4, 6, 9, 12, 18, 24].map((m) => <option key={m} value={m}>{m} months</option>)}</Select></FormField>
          <FormField id="hoursPerWeek" label="Hours per week" error={errs.hoursPerWeek}><Input id="hoursPerWeek" type="number" min="1" max="60" aria-invalid={!!errs.hoursPerWeek} value={f.hoursPerWeek} onChange={set('hoursPerWeek')} /></FormField>
          <FormField id="learningStyle" label="Learning style"><Select id="learningStyle" value={f.learningStyle} onChange={set('learningStyle')}><option value="mixed">Mixed</option><option value="video">Video / courses</option><option value="reading">Reading</option><option value="hands-on">Hands-on projects</option></Select></FormField>
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Building roadmap…' : 'Build my roadmap'}</Button>
      </form></CardContent></Card>
      <AnalysisResult loading={loading} error={error} data={data} onRetry={run}>{data && <RoadmapReport output={data.report.output} />}</AnalysisResult>
    </div>
  );
}
