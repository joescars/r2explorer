import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const Ctx = createContext<{ pref: ThemePref; cycle: () => void; setPref: (p: ThemePref) => void }>({ pref: 'system', cycle: () => {}, setPref: () => {} });

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => (localStorage.getItem('theme') as ThemePref) || 'system');
  useEffect(() => {
    apply(pref);
    if (pref === 'system') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      const h = () => apply('system');
      mq.addEventListener('change', h);
      return () => mq.removeEventListener('change', h);
    }
  }, [pref]);
  const setPref = useCallback((p: ThemePref) => {
    if (p === 'system') localStorage.removeItem('theme'); else localStorage.setItem('theme', p);
    setPrefState(p);
  }, []);
  const cycle = useCallback(() => setPref(pref === 'system' ? 'light' : pref === 'light' ? 'dark' : 'system'), [pref, setPref]);
  const v = useMemo(() => ({ pref, cycle, setPref }), [pref, cycle, setPref]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
