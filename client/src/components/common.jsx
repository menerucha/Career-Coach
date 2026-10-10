import { useState } from 'react';
import { AlertCircle, Check, Copy, Inbox, Sparkles, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/ApiContext.jsx';
import { useFetch } from '@/hooks/useAsync.js';

export const PageHeader = ({ title, description, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1>{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>{children}</div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, description, children }) => (
  <div className="flex flex-col items-center rounded-xl border border-dashed p-10 text-center"><Icon className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" /><p className="font-medium">{title}</p>{description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}<div className="mt-4">{children}</div></div>
);

/** Friendly messages for the error codes the API returns. */
export function ErrorAlert({ error, onRetry }) {
  if (!error) return null;
  const msg = { DAILY_LIMIT: error.message, RATE_LIMITED: error.message, AI_BUSY: error.message, NETWORK: error.message }[error.code] || error.message || 'Something went wrong.';
  const retryable = ['NETWORK', 'AI_UNAVAILABLE', 'AI_TIMEOUT', 'AI_BAD_OUTPUT', 'AI_BUSY'].includes(error.code) || error.status >= 500;
  return (
    <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{error.status === 429 ? 'Limit reached' : error.status === 400 ? 'Please check your input' : 'Something went wrong'}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3"><span>{msg}</span>{onRetry && retryable && <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>}</AlertDescription></Alert>
  );
}

export function FormField({ id, label, hint, error, optional, children }) {
  return (
    <div className="space-y-1.5"><div className="flex items-baseline justify-between"><Label htmlFor={id}>{label}{optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}</Label>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</div>
      {children}{error && <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">{error}</p>}</div>
  );
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } };
  return <Button type="button" variant="ghost" size="sm" onClick={copy} aria-label={label}>{done ? <Check className="text-success" /> : <Copy />}{done ? 'Copied' : label}</Button>;
}

/** Circular 0-100 score. Colour bands: >=80 good, >=60 fair, else needs work. */
export function ScoreRing({ value, size = 96, label }) {
  const v = Math.max(0, Math.min(100, Math.round(value))), r = 40, c = 2 * Math.PI * r;
  const color = v >= 80 ? 'stroke-success' : v >= 60 ? 'stroke-warning' : 'stroke-destructive';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label || 'Score'}: ${v} out of 100`}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90"><circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-secondary" /><circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className={cn('transition-all duration-700', color)} /></svg>
      <div className="absolute text-center leading-none"><div className="text-2xl font-bold">{v}</div>{label && <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>}</div>
    </div>
  );
}

export function QuotaBadge({ quota }) {
  if (!quota) return null;
  const low = quota.remaining <= Math.max(1, Math.floor(quota.limit * 0.15));
  return <Badge variant={quota.remaining === 0 ? 'destructive' : low ? 'warning' : 'secondary'} title="AI analyses left in the rolling 24 hours">{quota.remaining}/{quota.limit} analyses left today</Badge>;
}

export const EngineBadge = ({ engine, model }) => <Badge variant={engine === 'openai' ? 'success' : 'warning'} title={model || ''}>{engine === 'openai' ? `AI · ${model || 'OpenAI'}` : 'Offline demo engine'}</Badge>;

export const ResultsSkeleton = () => (
  <div className="space-y-4" role="status" aria-live="polite" aria-label="Analysing"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 animate-pulse" />Analysing… this can take up to a minute with a real AI model.</div><Skeleton className="h-28 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /></div>
);

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Delete', onConfirm, loading }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" disabled={loading} onClick={onConfirm}>{loading ? 'Deleting…' : confirmLabel}</Button></DialogFooter></DialogContent></Dialog>
  );
}

/** Chips input: Enter / comma / paste adds, Backspace on empty removes the last, case-insensitive de-dupe, max items. */
export function TagInput({ id, value, onChange, placeholder = 'Type a skill and press Enter', max = 50, maxLength = 60, 'aria-invalid': invalid }) {
  const [text, setText] = useState('');
  const add = (raw) => {
    const items = raw.split(/[,\n]/).map((s) => s.trim().slice(0, maxLength)).filter(Boolean);
    if (!items.length) return;
    const next = [...value]; for (const it of items) if (next.length < max && !next.some((v) => v.toLowerCase() === it.toLowerCase())) next.push(it);
    onChange(next); setText('');
  };
  return (
    <div className={cn('flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring', invalid && 'border-destructive')}>
      {value.map((t) => <Badge key={t} variant="secondary" className="gap-1 pr-1">{t}<button type="button" className="rounded-full p-0.5 hover:bg-background" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))}><X className="h-3 w-3" /></button></Badge>)}
      <Input id={id} aria-invalid={invalid} value={text} placeholder={value.length ? '' : placeholder} className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text); } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1)); }}
        onBlur={() => add(text)} onPaste={(e) => { const p = e.clipboardData.getData('text'); if (/[,\n]/.test(p)) { e.preventDefault(); add(p); } }} />
    </div>
  );
}

/** Pick the situation the user is in (new grad, career changer, ...). Sent to the API as `scenario`. */
export function ScenarioPicker({ value, onChange }) {
  const api = useApi();
  const { data } = useFetch(() => api.scenarios(), []);
  const list = data?.scenarios || [], current = list.find((s) => s.id === value);
  return (
    <div className="space-y-2" role="group" aria-label="Your situation">
      <div className="flex flex-wrap gap-2">
        {list.map((s) => <button key={s.id} type="button" aria-pressed={value === s.id} onClick={() => onChange(value === s.id ? '' : s.id, s)}
          className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors', value === s.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent')}>{s.label}</button>)}
      </div>
      {current && <p className="text-xs text-muted-foreground">{current.description}</p>}
    </div>
  );
}
