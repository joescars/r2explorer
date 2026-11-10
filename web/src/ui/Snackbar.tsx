import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface Snack { id: number; message: string; action?: { label: string; onClick: () => void }; tone?: 'default' | 'error' }
const Ctx = createContext<(message: string, opts?: Omit<Snack, 'id' | 'message'>) => void>(() => {});
export const useSnackbar = () => useContext(Ctx);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const dismiss = useCallback(() => setSnack(null), []);
  const show = useCallback((message: string, opts: Omit<Snack, 'id' | 'message'> = {}) => {
    window.clearTimeout(timer.current);
    setSnack({ id: Date.now(), message, ...opts });
    timer.current = window.setTimeout(dismiss, 5000);
  }, [dismiss]);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        {snack && (
          <div key={snack.id} className="anim-slide-up pointer-events-auto flex min-h-12 w-full max-w-[34rem] items-center gap-2 rounded-lg bg-inverse-surface py-2 pl-4 pr-2 text-sm text-inverse-on-surface shadow-e3">
            <span className="flex-1 break-words">{snack.message}</span>
            {snack.action && (
              <button type="button" onClick={() => { snack.action!.onClick(); dismiss(); }} className="state-layer rounded-full px-3 py-1.5 font-medium text-[#a8c7fa]">
                {snack.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" onClick={dismiss} className="state-layer rounded-full px-2 py-1.5 text-lg leading-none">×</button>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
