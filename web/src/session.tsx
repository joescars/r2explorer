import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, UNAUTHORIZED_EVENT } from './api';

interface S { status: 'loading' | 'in' | 'out' | 'offline'; readOnly: boolean; refresh: () => void; setOut: () => void; setIn: () => void }
const Ctx = createContext<S>(null as never);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<S['status']>('loading');
  const [readOnly, setReadOnly] = useState(false);
  const loadConfig = useCallback(async () => {
    try { setReadOnly(!!(await api.config()).readOnly); } catch { setReadOnly(true); /* fail safe: hide delete */ }
  }, []);
  const refresh = useCallback(() => {
    setStatus('loading');
    api.session().then((s) => {
      if (s.authenticated === false) return setStatus('out');
      setStatus('in'); void loadConfig();
    }).catch((e) => setStatus(e?.kind === 'unauthorized' ? 'out' : 'offline'));
  }, [loadConfig]);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    const h = () => setStatus('out');
    window.addEventListener(UNAUTHORIZED_EVENT, h);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, h);
  }, []);
  const setIn = useCallback(() => { setStatus('in'); void loadConfig(); }, [loadConfig]);
  return <Ctx.Provider value={{ status, readOnly, refresh, setOut: () => setStatus('out'), setIn }}>{children}</Ctx.Provider>;
}
