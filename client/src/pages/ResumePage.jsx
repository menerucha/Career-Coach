import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, PageHeader, ScenarioPicker } from '@/components/common.jsx';
import { AnalysisResult, compact } from '@/components/AnalysisShell.jsx';
import { ResumeReport } from '@/components/reports.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { useMe } from '@/lib/MeContext.jsx';
import { useAction } from '@/hooks/useAsync.js';

const readFile = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(file); });

export default function ResumePage() {
  const api = useApi(), { setQuota } = useMe(), fileRef = useRef(null);
  const [f, setF] = useState({ resumeText: '', targetRole: '', jobDescription: '', scenario: '' });
  const [local, setLocal] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const { run, loading, error, data } = useAction(() => api.analyze('resume', compact({ ...f, resumeText: f.resumeText.trim() })));
  const errs = { ...local, ...(error?.status === 400 ? error.fields : {}) };

  async function submit(e) {
    e.preventDefault();
    const v = {}; const len = f.resumeText.trim().length;
    if (len < 200) v.resumeText = `Resume text must be at least 200 characters (you have ${len})`; else if (len > 15000) v.resumeText = 'Resume text must be at most 15000 characters';
    setLocal(v); if (Object.keys(v).length) return;
    const d = await run(); if (d) { setQuota(d.quota); toast.success('Resume analysed and saved'); }
  }
  async function onFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 200_000) return toast.error('File too large. Paste the text instead (max ~15,000 characters).');
    try { setF((s) => ({ ...s, resumeText: '' })); const t = await readFile(file); setF((s) => ({ ...s, resumeText: t.slice(0, 15000) })); } catch { toast.error('Could not read that file. Paste the text instead.'); }
    e.target.value = '';
  }

  return (
    <div>
      <PageHeader title="Resume feedback" description="Paste your resume for a scored review with concrete rewrites. Add a target role or job description to check keywords." />
      <Card><CardContent className="p-5"><form onSubmit={submit} className="space-y-5" noValidate>
        <FormField id="scenario" label="Your situation" optional><ScenarioPicker value={f.scenario} onChange={(id) => setF((s) => ({ ...s, scenario: id }))} /></FormField>
        <div className="grid gap-4 md:grid-cols-2"><FormField id="targetRole" label="Target role" optional error={errs.targetRole}><Input id="targetRole" value={f.targetRole} onChange={set('targetRole')} placeholder="e.g. Frontend Developer" maxLength={100} /></FormField></div>
        <FormField id="resumeText" label="Resume text" hint={`${f.resumeText.trim().length}/15000`} error={errs.resumeText}>
          <Textarea id="resumeText" aria-invalid={!!errs.resumeText} aria-describedby={errs.resumeText ? 'resumeText-error' : undefined} className="min-h-[260px] font-mono text-xs" value={f.resumeText} onChange={set('resumeText')} placeholder="Paste your resume here (plain text)…" />
          <div className="pt-1"><input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" aria-label="Upload resume text file" onChange={onFile} /><Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload />Load from .txt / .md file</Button></div>
        </FormField>
        <FormField id="jobDescription" label="Job description" optional error={errs.jobDescription}><Textarea id="jobDescription" value={f.jobDescription} onChange={set('jobDescription')} placeholder="Paste the job posting to tailor the keyword check…" maxLength={8000} /></FormField>
        <Button type="submit" disabled={loading}>{loading ? 'Analysing…' : 'Analyse resume'}</Button>
      </form></CardContent></Card>
      <AnalysisResult loading={loading} error={error} data={data} onRetry={run}>{data && <ResumeReport output={data.report.output} />}</AnalysisResult>
    </div>
  );
}
