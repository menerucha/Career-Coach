import { ArrowRight, FileText, MessageSquare, Route, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, PageHeader } from '@/components/common.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { useMe } from '@/lib/MeContext.jsx';
import { useSession } from '@/lib/session.js';
import { useFetch } from '@/hooks/useAsync.js';
import { TYPE_LABELS, formatDate } from '@/lib/format.js';

const FLOWS = [
  { to: '/resume', title: 'Resume feedback', icon: FileText, text: 'Scored review with concrete rewrites and missing keywords.' },
  { to: '/skill-gap', title: 'Skill-gap analysis', icon: Target, text: 'See what your target role needs and what to learn first.' },
  { to: '/roadmap', title: 'Career roadmap', icon: Route, text: 'A phased plan that fits your timeframe and weekly hours.' },
  { to: '/interview', title: 'Interview prep', icon: MessageSquare, text: 'Tailored questions plus feedback on your practice answers.' },
];

export default function Dashboard() {
  const api = useApi(), { me } = useMe(), s = useSession();
  const recent = useFetch(() => api.listReports({ limit: 5 }), []);
  return (
    <div>
      <PageHeader title={`Welcome${s.user?.name ? `, ${s.user.name.split(' ')[0]}` : ''}`} description="Pick a workflow to get personalised, actionable career guidance." />
      <div className="grid gap-4 sm:grid-cols-2">{FLOWS.map(({ to, title, icon: Icon, text }) => (
        <Link key={to} to={to} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-shadow group-hover:shadow-md"><CardHeader><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-5 w-5" aria-hidden="true" /></div><CardTitle className="flex items-center justify-between">{title}<ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" /></CardTitle><CardDescription>{text}</CardDescription></CardHeader></Card>
        </Link>))}</div>
      <section className="mt-10" aria-labelledby="recent-h">
        <div className="mb-3 flex items-center justify-between"><h2 id="recent-h">Recent reports</h2><Link to="/history" className="text-sm font-medium text-primary hover:underline">View all</Link></div>
        {recent.loading ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : recent.data?.items.length ? (
          <ul className="space-y-2">{recent.data.items.map((r) => <li key={r.id}><Link to={`/reports/${r.id}`} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm hover:bg-accent"><span className="font-medium">{r.title}</span><span className="text-xs text-muted-foreground">{TYPE_LABELS[r.type]} · {formatDate(r.createdAt)}</span></Link></li>)}</ul>
        ) : <EmptyState title="No reports yet" description="Run your first analysis and it will show up here." />}
      </section>
      {me && !me.profile && <p className="mt-8 text-sm text-muted-foreground">Tip: <Link to="/profile" className="font-medium text-primary hover:underline">save your profile</Link> to pre-fill forms with your target role and skills.</p>}
    </div>
  );
}
