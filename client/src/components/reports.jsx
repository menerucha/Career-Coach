import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Flag, Lightbulb, Rocket, ShieldAlert, Target, TrendingUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { CopyButton, ErrorAlert, FormField, ResultsSkeleton, ScoreRing } from '@/components/common.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { useAction } from '@/hooks/useAsync.js';
import { cn } from '@/lib/utils';

const barColor = (v) => (v >= 80 ? 'bg-success' : v >= 60 ? 'bg-warning' : 'bg-destructive');
const List = ({ items, icon: Icon = Circle, className }) => <ul className={cn('space-y-1.5 text-sm', className)}>{items.map((t, i) => <li key={i} className="flex gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{t}</span></li>)}</ul>;
const Section = ({ title, icon: Icon, children, description }) => (
  <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base">{Icon && <Icon className="h-4 w-4 text-primary" aria-hidden="true" />}{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader><CardContent>{children}</CardContent></Card>
);

export function ResumeReport({ output: o }) {
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-col items-center gap-5 p-5 sm:flex-row"><ScoreRing value={o.overallScore} label="Overall" size={112} /><div className="flex-1"><h2>Resume score</h2><p className="mt-1 text-sm text-muted-foreground">{o.summary}</p></div></CardContent></Card>
      <Section title="Score breakdown" icon={TrendingUp}>
        <div className="space-y-4">{o.sectionScores.map((s) => (
          <div key={s.name}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{s.name}</span><span className="tabular-nums">{s.score}/100</span></div><Progress value={s.score} indicatorClassName={barColor(s.score)} aria-label={`${s.name} score`} /><p className="mt-1 text-xs text-muted-foreground">{s.comment}</p></div>))}</div>
      </Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Strengths" icon={CheckCircle2}><List items={o.strengths} icon={CheckCircle2} /></Section>
        <Section title="Missing keywords" icon={Target} description="Add only where they are truthful for you.">{o.missingKeywords.length ? <div className="flex flex-wrap gap-1.5">{o.missingKeywords.map((k) => <Badge key={k} variant="outline">{k}</Badge>)}</div> : <p className="text-sm text-muted-foreground">No obvious gaps found.</p>}</Section>
      </div>
      <Section title="Suggested improvements" icon={Lightbulb}>
        <Accordion type="multiple" defaultValue={['0']}>{o.improvements.map((im, i) => (
          <AccordionItem key={i} value={String(i)}><AccordionTrigger>{im.issue}</AccordionTrigger>
            <AccordionContent className="space-y-3"><p><span className="font-medium">Why it matters: </span>{im.whyItMatters}</p><p><span className="font-medium">What to do: </span>{im.suggestion}</p>
              {im.exampleRewrite && <div className="rounded-md bg-muted p-3"><div className="mb-1 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example rewrite</span><CopyButton text={im.exampleRewrite} /></div><p>{im.exampleRewrite}</p></div>}</AccordionContent></AccordionItem>))}</Accordion>
      </Section>
      <Section title="Draft professional summary" icon={Flag} description="A starting point: replace anything in [brackets] with your real details."><p className="text-sm">{o.rewrittenSummary}</p><div className="mt-2"><CopyButton text={o.rewrittenSummary} /></div></Section>
    </div>
  );
}

const IMPORTANCE = { critical: 'destructive', important: 'warning', 'nice-to-have': 'secondary' };
export function SkillGapReport({ output: o }) {
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-col items-center gap-5 p-5 sm:flex-row"><ScoreRing value={o.matchPercent} label="Match" size={112} /><div className="flex-1"><h2>{o.targetRole}: skills match</h2><p className="mt-1 text-sm text-muted-foreground">{o.summary}</p></div></CardContent></Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Skills you already have" icon={CheckCircle2}>{o.matchedSkills.length ? <div className="flex flex-wrap gap-1.5">{o.matchedSkills.map((s) => <Badge key={s} variant="success">{s}</Badge>)}</div> : <p className="text-sm text-muted-foreground">No direct matches yet.</p>}</Section>
        <Section title="Transferable strengths" icon={Rocket}>{o.transferableSkills.length ? <div className="flex flex-wrap gap-1.5">{o.transferableSkills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div> : <p className="text-sm text-muted-foreground">None identified from your list.</p>}</Section>
      </div>
      <Section title={`Skill gaps (${o.gaps.length})`} icon={Target}>
        {o.gaps.length === 0 ? <p className="text-sm">No gaps found for this role.</p> : (
          <ul className="divide-y">{o.gaps.map((g) => (
            <li key={g.skill} className="space-y-1.5 py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><span className="font-medium capitalize">{g.skill}</span><Badge variant={IMPORTANCE[g.importance]}>{g.importance}</Badge><span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />~{g.estimatedHours}h</span></div>
              <p className="text-sm text-muted-foreground">{g.whyItMatters}</p><p className="text-sm"><span className="font-medium">How to learn: </span>{g.howToLearn}</p></li>))}</ul>)}
      </Section>
      <Section title="Next steps" icon={Rocket}><List items={o.nextSteps} icon={CheckCircle2} /></Section>
    </div>
  );
}

export function RoadmapReport({ output: o }) {
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-5"><h2>{o.targetRole}: {o.totalWeeks}-week roadmap</h2><p className="mt-1 text-sm text-muted-foreground">{o.summary}</p></CardContent></Card>
      <ol className="space-y-4">{o.phases.map((p, i) => (
        <li key={i}><Card><CardHeader className="pb-3"><div className="flex flex-wrap items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span><CardTitle>{p.title}</CardTitle><Badge variant="secondary">{p.weeks} {p.weeks === 1 ? 'week' : 'weeks'}</Badge></div></CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div><h4 className="mb-1.5 font-medium">Goals</h4><List items={p.goals} /><h4 className="mb-1.5 mt-3 font-medium">Activities</h4><List items={p.activities} icon={CheckCircle2} /></div>
            <div>{p.skills.length > 0 && <><h4 className="mb-1.5 font-medium">Skills</h4><div className="mb-3 flex flex-wrap gap-1.5">{p.skills.map((s) => <Badge key={s} variant="outline" className="capitalize">{s}</Badge>)}</div></>}
              {p.resources.length > 0 && <><h4 className="mb-1.5 font-medium">Resources <span className="font-normal text-muted-foreground">(search for these)</span></h4><ul className="mb-3 space-y-1.5">{p.resources.map((r, k) => <li key={k}><span className="font-medium">{r.title}</span> <Badge variant="secondary" className="ml-1">{r.type}</Badge><div className="text-xs text-muted-foreground">Search: “{r.searchHint}”</div></li>)}</ul></>}
              <div className="rounded-md bg-accent p-3 text-accent-foreground"><div><span className="font-medium">Milestone: </span>{p.milestone}</div><div className="mt-1"><span className="font-medium">Project: </span>{p.project}</div></div></div>
          </CardContent></Card></li>))}</ol>
      <div className="grid gap-4 md:grid-cols-2"><Section title="First week" icon={Rocket}><List items={o.firstWeekActions} icon={CheckCircle2} /></Section><Section title="Watch out for" icon={ShieldAlert}><List items={o.risks} icon={ShieldAlert} /></Section></div>
    </div>
  );
}

export function AnswerFeedbackCard({ output: o }) {
  const star = [['situation', 'Situation'], ['task', 'Task'], ['action', 'Action'], ['result', 'Result']];
  return (
    <div className="space-y-4" data-testid="answer-feedback">
      <Card><CardContent className="flex flex-col items-center gap-5 p-5 sm:flex-row"><ScoreRing value={o.score} label="Answer" /><div className="flex-1"><p className="font-medium">{o.verdict}</p>
        <div className="mt-2 flex flex-wrap gap-2" aria-label="STAR coverage">{star.map(([k, label]) => <Badge key={k} variant={o.starCoverage[k] ? 'success' : 'destructive'}>{o.starCoverage[k] ? '✓' : '✗'} {label}</Badge>)}</div></div></CardContent></Card>
      <div className="grid gap-4 md:grid-cols-2"><Section title="What worked" icon={CheckCircle2}><List items={o.strengths} icon={CheckCircle2} /></Section><Section title="To improve" icon={Lightbulb}><List items={o.improvements} icon={Lightbulb} /></Section></div>
      <Section title="Improved answer" icon={Flag}><p className="whitespace-pre-wrap text-sm">{o.improvedAnswer}</p><div className="mt-2"><CopyButton text={o.improvedAnswer} /></div></Section>
    </div>
  );
}

const CATEGORY = { behavioral: 'secondary', technical: 'default', 'system-design': 'default', situational: 'warning', culture: 'success' };
function PracticeBox({ question, role, reportId }) {
  const api = useApi();
  const [answer, setAnswer] = useState('');
  const { run, loading, error, data } = useAction(() => api.analyze('interview-feedback', { question, answer, role, reportId }));
  const short = answer.trim().length < 50, id = `ans-${btoa(unescape(encodeURIComponent(question))).slice(0, 12)}`;
  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
      <FormField id={id} label="Your answer" hint={`${answer.trim().length}/4000 · at least 50 characters`}><Textarea id={id} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={4000} placeholder="Type your answer as you would say it in the interview…" /></FormField>
      <Button size="sm" disabled={loading || short} onClick={run}>{loading ? 'Reviewing…' : 'Get feedback'}</Button>
      {loading && <ResultsSkeleton />}<ErrorAlert error={error} onRetry={run} />
      {data && <AnswerFeedbackCard output={data.report.output} />}
    </div>
  );
}

export function InterviewReport({ report, output: o, input }) {
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-5"><h2>{o.role}: {o.questions.length} {o.interviewType} questions</h2><p className="mt-1 text-sm text-muted-foreground">Level: {o.level}. Open a question to see what interviewers look for, then practise your own answer for instant feedback.</p></CardContent></Card>
      <Card><CardContent className="p-2 sm:p-4"><Accordion type="multiple">{o.questions.map((q, i) => (
        <AccordionItem key={i} value={String(i)}><AccordionTrigger><span className="flex flex-1 flex-wrap items-center gap-2"><Badge variant={CATEGORY[q.category] || 'secondary'}>{q.category}</Badge><span>{q.question}</span></span></AccordionTrigger>
          <AccordionContent className="space-y-3 px-1"><p><span className="font-medium">Why they ask: </span>{q.whyAsked}</p><div><span className="font-medium">A strong answer includes:</span><List items={q.strongAnswerIncludes} icon={CheckCircle2} className="mt-1" /></div><p><span className="font-medium">Outline: </span>{q.answerOutline}</p>
            {report?.id && <PracticeBox question={q.question} role={o.role} reportId={report.id} />}</AccordionContent></AccordionItem>))}</Accordion></CardContent></Card>
      <Section title="Tips" icon={Lightbulb}><List items={o.tips} icon={Lightbulb} /></Section>
    </div>
  );
}

export function ReportRenderer({ report }) {
  const { type, output } = report;
  if (type === 'resume') return <ResumeReport output={output} />;
  if (type === 'skill_gap') return <SkillGapReport output={output} />;
  if (type === 'roadmap') return <RoadmapReport output={output} />;
  if (type === 'interview') return <InterviewReport report={report} output={output} input={report.input} />;
  if (type === 'answer_feedback') return <AnswerFeedbackCard output={output} />;
  return <Alert><AlertTitle>Unknown report type</AlertTitle><AlertDescription>{type}</AlertDescription></Alert>;
}
