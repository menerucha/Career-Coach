import { Compass, Info, LogOut } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { QuotaBadge } from '@/components/common.jsx';
import { useMe } from '@/lib/MeContext.jsx';
import { useSession } from '@/lib/session.js';
import { cn } from '@/lib/utils';

const ClerkUserButton = lazy(() => import('@/lib/ClerkAuth.jsx').then((m) => ({ default: m.ClerkUserButton })));
const NAV = [['/dashboard', 'Dashboard'], ['/resume', 'Resume'], ['/skill-gap', 'Skills'], ['/roadmap', 'Roadmap'], ['/interview', 'Interview'], ['/history', 'History']];

export function UserMenu() {
  const s = useSession();
  if (!s.isSignedIn) return null;
  if (s.mode === 'clerk') return <Suspense fallback={null}><ClerkUserButton /></Suspense>;
  return (
    <div className="flex items-center gap-2"><span className="hidden text-sm text-muted-foreground sm:inline">{s.user?.name}</span>
      <Button variant="ghost" size="sm" onClick={s.signOut} aria-label="Sign out"><LogOut />Sign out</Button></div>
  );
}

export default function Layout() {
  const { me } = useMe();
  const s = useSession();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="container flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold"><Compass className="h-5 w-5 text-primary" aria-hidden="true" />Career Coach</Link>
          <nav aria-label="Main" className="order-3 flex w-full flex-wrap gap-1 sm:order-none sm:w-auto sm:flex-1">
            {NAV.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', isActive && 'bg-accent text-accent-foreground')}>{label}</NavLink>)}
          </nav>
          <div className="ml-auto flex items-center gap-3"><QuotaBadge quota={me?.quota} /><UserMenu /></div>
        </div>
      </header>
      {(me?.engine === 'mock' || s.mode === 'demo') && (
        <div className="container mt-4"><Alert variant="warning"><Info className="h-4 w-4" /><AlertDescription>
          {me?.engine === 'mock' && <>Running on the <strong>offline demo engine</strong> (rule-based, no AI). Set <code>OPENAI_API_KEY</code> on the server for real AI feedback. </>}
          {s.mode === 'demo' && <>Demo sign-in is active (no Clerk keys configured), so it is not secure for real use.</>}</AlertDescription></Alert></div>
      )}
      <main className="container flex-1 py-8"><Outlet /></main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">AI-generated guidance is a starting point, not professional advice. Don't paste sensitive personal data.</footer>
      <Toaster />
    </div>
  );
}
