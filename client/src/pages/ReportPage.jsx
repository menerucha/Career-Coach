import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog, EngineBadge, ErrorAlert, PageHeader } from '@/components/common.jsx';
import { ReportRenderer } from '@/components/reports.jsx';
import { useApi } from '@/lib/ApiContext.jsx';
import { useFetch } from '@/hooks/useAsync.js';
import { TYPE_LABELS, formatDateTime } from '@/lib/format.js';

export default function ReportPage() {
  const { id } = useParams(), api = useApi(), nav = useNavigate();
  const { data, error, loading, reload } = useFetch(() => api.getReport(id), [id]);
  const [confirm, setConfirm] = useState(false), [deleting, setDeleting] = useState(false);
  async function del() {
    setDeleting(true);
    try { await api.deleteReport(id); toast.success('Report deleted'); nav('/history'); } catch (e) { toast.error(e.message); setDeleting(false); }
  }
  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;
  if (error) return <div className="space-y-4"><Button asChild variant="ghost" size="sm"><Link to="/history"><ArrowLeft />Back to history</Link></Button><ErrorAlert error={error} onRetry={error.status === 404 ? undefined : reload} /></div>;
  const r = data.report;
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3"><Link to="/history"><ArrowLeft />History</Link></Button>
      <PageHeader title={r.title} description={`${TYPE_LABELS[r.type]} · ${formatDateTime(r.createdAt)}`}>
        <div className="flex items-center gap-2"><EngineBadge engine={r.engine} model={r.model} /><Button variant="outline" size="sm" onClick={() => setConfirm(true)}><Trash2 />Delete</Button></div>
      </PageHeader>
      <ReportRenderer report={r} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Delete this report?" description="This permanently removes the report and cannot be undone." onConfirm={del} loading={deleting} />
    </div>
  );
}
