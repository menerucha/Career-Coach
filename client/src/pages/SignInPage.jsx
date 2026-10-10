import { lazy, Suspense, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/common.jsx';
import { useSession } from '@/lib/session.js';

const ClerkSignIn = lazy(() => import('@/lib/ClerkAuth.jsx').then((m) => ({ default: m.ClerkSignIn })));
const ClerkSignUp = lazy(() => import('@/lib/ClerkAuth.jsx').then((m) => ({ default: m.ClerkSignUp })));

function DemoSignIn({ signIn }) {
  const [name, setName] = useState(''), [err, setErr] = useState('');
  return (
    <Card className="w-full max-w-md"><CardHeader><CardTitle>Try the demo</CardTitle><CardDescription>No account needed: pick any name. Your data stays tied to that name on this server.</CardDescription></CardHeader>
      <CardContent><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); try { signIn(name); } catch (x) { setErr(x.message); } }} noValidate>
        <FormField id="demo-name" label="Your name" error={err}><Input id="demo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" aria-invalid={!!err} maxLength={60} autoFocus /></FormField>
        <Button type="submit" className="w-full">Continue</Button>
        <Alert variant="warning"><AlertDescription className="text-xs">Demo sign-in is not secure. Configure Clerk keys (see README) for real authentication.</AlertDescription></Alert></form></CardContent></Card>
  );
}

export default function SignInPage({ signUp = false }) {
  const s = useSession();
  if (s.isLoaded && s.isSignedIn) return <Navigate to="/dashboard" replace />;
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      {s.mode === 'clerk' ? <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>{signUp ? <ClerkSignUp /> : <ClerkSignIn />}</Suspense> : <DemoSignIn signIn={s.signIn} />}
    </div>
  );
}
