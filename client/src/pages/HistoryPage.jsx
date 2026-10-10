import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog, EmptyState, ErrorAlert, PageHeader } from '@/components/common.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { TYPE_LABELS, formatDateTime } from '@/lib/format.js';

const FILTERS = [['', 'All'], ['resume', 'Resume'], ['skill_gap', 'Skill gap'], ['roadmap', 'Roadmap'], ['interview', 'Interview'], ['answer_feedback', 'Answers']];

export default function HistoryPage() {
  const api = useApi();
  const [type, setType] = useState('');
  const [state, setState] = useState({ items: [], cursor: null, loading: true, error: null, loadingMore: false });
  const [toDelete, setToDelete] = useState(null), [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    setState({ items: [], cursor: null, loading: true, error: null, loadingMore: false });
    api.listReports({ type }).then((r) => alive && setState({ items: r.items, cursor: r.nextCursor, loading: false, error: null, loadingMore: false })).catch((error) => alive && setState((s) => ({ ...s, loading: false, error })));
    return () => { alive = false; };
  }, [api, type]);

  async function more() {
    setState((s) => ({ ...s, loadingMore: true }));
    try { const r = await api.listReports({ type, cursor: state.cursor }); setState((s) => ({ ...s, items: [...s.items, ...r.items], cursor: r.nextCursor, loadingMore: false })); }
    catch (error) { setState((s) => ({ ...s, loadingMore: false })); toast.error(error.message); }
  }
  async function confirmDelete() {
    setDeleting(true);
    try { await api.deleteReport(toDelete.id); setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== toDelete.id) })); toast.success('Report deleted'); setToDelete(null); }
    catch (e) { toast.error(e.message || 'Could not delete the report'); } finally { setDeleting(false); }
  }

  return (
    <div>
      <PageHeader title="History" description="Everything you've generated, saved to your account." />
      <Tabs value={type} onValueChange={setType}><TabsList className="h-auto flex-wrap">{FILTERS.map(([v, l]) => <TabsTrigger key={v || 'all'} value={v}>{l}</TabsTrigger>)}</TabsList></Tabs>
      <div className="mt-4">
        {state.loading ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
          : state.error ? <ErrorAlert error={state.error} onRetry={() => setType((t) => t)} />
          : state.items.length === 0 ? <EmptyState title="Nothing here yet" description={type ? 'No reports of this type yet.' : 'Your generated reports will appear here.'}><Button asChild><Link to="/dashboard">Start an analysis</Link></Button></EmptyState>
          : (<>
            <ul className="space-y-2">{state.items.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <Link to={`/reports/${r.id}`} className="min-w-0 flex-1"><div className="truncate font-medium">{r.title}</div><div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{TYPE_LABELS[r.type]}</Badge><span>{formatDateTime(r.createdAt)}</span>{r.engine === 'mock' && <Badge variant="warning">demo engine</Badge>}</div></Link>
                <Button variant="ghost" size="icon" aria-label={`Delete ${r.title}`} onClick={() => setToDelete(r)}><Trash2 className="text-muted-foreground" /></Button>
              </li>))}</ul>
            {state.cursor && <div className="mt-4 text-center"><Button variant="outline" onClick={more} disabled={state.loadingMore}>{state.loadingMore ? 'Loading…' : 'Load more'}</Button></div>}
          </>)}
      </div>
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this report?" description={toDelete ? `“${toDelete.title}” will be permanently removed. This won't give back your daily analysis allowance.` : ''} onConfirm={confirmDelete} loading={deleting} />
    </div>
  );
}
