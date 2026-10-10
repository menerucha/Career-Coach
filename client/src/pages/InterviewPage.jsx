import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField, PageHeader, ScenarioPicker } from '@/components/common.jsx';
import { AnalysisResult, compact } from '@/components/AnalysisShell.jsx';
import { InterviewReport } from '@/components/reports.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { useMe } from '@/lib/MeContext.jsx';
import { useAction } from '@/hooks/useAsync.js';

export default function InterviewPage() {
  const api = useApi(), { setQuota } = useMe();
  const [f, setF] = useState({ role: '', level: 'mid', interviewType: 'mixed', numQuestions: 5, resumeText: '', scenario: '' });
  const [local, setLocal] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const { run, loading, error, data } = useAction(() => api.analyze('interview', compact({ ...f, numQuestions: Number(f.numQuestions) })));
  const errs = { ...local, ...(error?.status === 400 ? error.fields : {}) };
  async function submit(e) {
    e.preventDefault();
    const v = {}; if (f.role.trim().length < 2) v.role = 'Role must be at least 2 characters';
    setLocal(v); if (Object.keys(v).length) return;
    const d = await run(); if (d) { setQuota(d.quota); toast.success('Interview questions ready'); }
  }
  return (
    <div>
      <PageHeader title="Interview prep" description="Get tailored questions with guidance on what a strong answer includes, then practise your own answers and get feedback." />
      <Card><CardContent className="p-5"><form onSubmit={submit} className="space-y-5" noValidate>
        <FormField id="scenario" label="Your situation" optional><ScenarioPicker value={f.scenario} onChange={(id, sc) => setF((s) => ({ ...s, scenario: id, ...(sc && { level: sc.defaults.level }) }))} /></FormField>
        <div className="grid gap-4 md:grid-cols-4">
          <FormField id="role" label="Role" error={errs.role}><Input id="role" aria-invalid={!!errs.role} value={f.role} onChange={set('role')} placeholder="e.g. Backend Developer" maxLength={100} /></FormField>
          <FormField id="level" label="Level"><Select id="level" value={f.level} onChange={set('level')}>{['intern', 'junior', 'mid', 'senior', 'lead'].map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}</Select></FormField>
          <FormField id="interviewType" label="Interview type"><Select id="interviewType" value={f.interviewType} onChange={set('interviewType')}><option value="mixed">Mixed</option><option value="behavioral">Behavioural</option><option value="technical">Technical</option><option value="system-design">System design</option></Select></FormField>
          <FormField id="numQuestions" label="Questions"><Select id="numQuestions" value={f.numQuestions} onChange={set('numQuestions')}>{[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n}</option>)}</Select></FormField>
        </div>
        <FormField id="resumeText" label="Resume" optional hint="Used to tailor questions"><Textarea id="resumeText" value={f.resumeText} onChange={set('resumeText')} maxLength={15000} placeholder="Paste your resume to get questions about your own experience…" /></FormField>
        <Button type="submit" disabled={loading}>{loading ? 'Preparing…' : 'Generate questions'}</Button>
      </form></CardContent></Card>
      <AnalysisResult loading={loading} error={error} data={data} onRetry={run}>{data && <InterviewReport report={data.report} output={data.report.output} />}</AnalysisResult>
    </div>
  );
}
