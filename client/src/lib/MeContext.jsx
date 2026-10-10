import { createContext, useCallback, useContext, useMemo } from 'react';
import { useFetch } from '@/hooks/useAsync.js';
import { useApi } from './ApiContext.jsx';
import { useSession } from './session.js';

const Ctx = createContext({ me: null, reload: () => {}, setQuota: () => {} });
export const useMe = () => useContext(Ctx);

/** Loads /api/me once the user is signed in (profile, quota, which engine is active). */
export function MeProvider({ children }) {
  const api = useApi(), s = useSession();
  const { data, error, reload, setData } = useFetch(() => api.me(), [s.user?.id], { enabled: s.isSignedIn });
  const setQuota = useCallback((quota) => quota && setData((m) => (m ? { ...m, quota } : m)), [setData]);
  const value = useMemo(() => ({ me: data, error, reload, setQuota }), [data, error, reload, setQuota]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
