import { createContext, useContext } from 'react';
/** One auth interface for the whole app: { mode, isLoaded, isSignedIn, user, getToken, signOut, signIn? } */
export const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);
