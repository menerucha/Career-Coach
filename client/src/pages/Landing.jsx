import { Compass, FileText, MessageSquare, Route, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/session.js';

const FEATURES = [[FileText, 'Resume feedback', 'A scored review with concrete rewrites, grounded in your own bullets.'], [Target, 'Skill-gap analysis', 'See exactly what your target role needs and what to learn first.'], [Route, 'Learning roadmap', 'A phased plan that fits your timeline and weekly hours.'], [MessageSquare, 'Interview practice', 'Tailored questions and instant feedback on your answers.']];

export default function Landing() {
  const s = useSession();
  return (
    <div className="min-h-screen">
      <header className="container flex items-center justify-between py-4"><div className="flex items-center gap-2 font-bold"><Compass className="h-5 w-5 text-primary" aria-hidden="true" />Career Coach</div>
        <Button asChild variant="outline" size="sm"><Link to={s.isSignedIn ? '/dashboard' : '/sign-in'}>{s.isSignedIn ? 'Open dashboard' : 'Sign in'}</Link></Button></header>
      <main className="container py-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Your AI career coach, from resume to offer</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Personalised feedback, skill-gap analysis, learning roadmaps and interview practice for students, career changers and experienced professionals.</p>
        <div className="mt-8"><Button asChild size="lg"><Link to={s.isSignedIn ? '/dashboard' : '/sign-in'}>Get started free</Link></Button></div>
        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">{FEATURES.map(([Icon, t, d]) => (
          <div key={t} className="rounded-xl border bg-card p-5 shadow-sm"><Icon className="mb-3 h-6 w-6 text-primary" aria-hidden="true" /><h2 className="mb-1 text-base">{t}</h2><p className="text-sm text-muted-foreground">{d}</p></div>))}</div>
      </main>
    </div>
  );
}
