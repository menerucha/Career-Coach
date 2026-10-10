import { createContext, useContext, useMemo } from 'react';
import { createApi } from './api.js';
import { useSession } from './session.js';
const Ctx = createContext(null);
export function ApiProvider({ children, api }) {
  const s = useSession();
  const value = useMemo(() => api || createApi(s.getToken), [api, s.getToken]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useApi = () => useContext(Ctx);
