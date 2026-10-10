import { ClerkProvider, SignIn, SignUp, UserButton, useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { SessionContext } from './session.js';

function Bridge({ children }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const value = useMemo(() => ({
    mode: 'clerk', isLoaded, isSignedIn: !!isSignedIn,
    user: user ? { id: user.id, name: user.fullName || user.primaryEmailAddress?.emailAddress || 'You', imageUrl: user.imageUrl } : null,
    getToken: () => getToken(), signOut: () => signOut(),
  }), [isLoaded, isSignedIn, user, getToken, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export default function ClerkAuth({ publishableKey, children }) {
  return <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/"><Bridge>{children}</Bridge></ClerkProvider>;
}
export const ClerkSignIn = () => <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />;
export const ClerkSignUp = () => <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />;
export const ClerkUserButton = () => <UserButton />;
