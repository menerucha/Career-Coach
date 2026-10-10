import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EngineBadge, ErrorAlert, ResultsSkeleton } from '@/components/common.jsx';

/** Shared results area for every workflow: loading skeleton, error with retry, then the saved-report banner + content. */
export function AnalysisResult({ loading, error, data, onRetry, children }) {
  return (
    <div className="mt-8" aria-live="polite">
      {loading && <ResultsSkeleton />}
      {!loading && <ErrorAlert error={error} onRetry={onRetry} />}
      {!loading && data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><EngineBadge engine={data.report.engine} model={data.report.model} /><span>Saved to your history.</span>
            <Button asChild variant="link" size="sm" className="h-auto p-0"><Link to={`/reports/${data.report.id}`}>Open report</Link></Button></div>
          {children}
        </div>
      )}
    </div>
  );
}

/** Fields the user edits -> request body: drop empty optionals. */
export const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null));
