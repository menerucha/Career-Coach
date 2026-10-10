import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { SessionContext } from './session.js';

export const CLERK_KEY = import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY || '';
export const authMode = CLERK_KEY ? 'clerk' : 'demo';
const ClerkAuth = lazy(() => import('./ClerkAuth.jsx'));      // the Clerk SDK is only downloaded when a publishable key is configured

const KEY = 'cc.demoUser';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };

/** DEMO ONLY (no Clerk key): a local fake user so the app runs offline. The server must be in AUTH_MODE=demo too. */
function DemoAuth({ children }) {
  const [user, setUser] = useState(read);
  const signIn = useCallback((name) => {
    const slug = String(name).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
    if (slug.length < 3) throw new Error('Use at least 3 letters or digits');
    const u = { id: `demo_${slug}`, name: String(name).trim().slice(0, 60), slug };
    try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* private mode */ }
    setUser(u);
  }, []);
  const signOut = useCallback(async () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setUser(null); }, []);
  const value = useMemo(() => ({ mode: 'demo', isLoaded: true, isSignedIn: !!user, user, getToken: async () => (user ? `demo.${user.slug}` : null), signIn, signOut }), [user, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function AuthProvider({ children }) {
  if (!CLERK_KEY) return <DemoAuth>{children}</DemoAuth>;
  return <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}><ClerkAuth publishableKey={CLERK_KEY}>{children}</ClerkAuth></Suspense>;
}
export { DemoAuth };
