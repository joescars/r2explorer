import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, HardDrive, LogOut, Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import { api } from '../api';
import type { Bucket } from '../api';
import { useSession } from '../session';
import { useTheme } from '../theme';
import { IconButton, Skeleton, useSnackbar } from '../ui';

export interface ShellCtx { buckets: Bucket[] | null; bucketsError: unknown; reloadBuckets: () => void }

export function ThemeToggle() {
  const { pref, cycle } = useTheme();
  const Icon = pref === 'system' ? Monitor : pref === 'dark' ? Moon : Sun;
  const label = pref === 'system' ? 'Theme: match system' : pref === 'dark' ? 'Theme: dark' : 'Theme: light';
  return <IconButton label={`${label} (click to change)`} onClick={cycle}><Icon className="h-5 w-5" /></IconButton>;
}

export function Shell() {
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [bucketsError, setBucketsError] = useState<unknown>(null);
  const [open, setOpen] = useState(false);
  const { setOut, readOnly } = useSession();
  const nav = useNavigate();
  const loc = useLocation();
  const snack = useSnackbar();

  const reloadBuckets = useCallback(() => {
    setBucketsError(null); setBuckets(null);
    api.buckets().then((r) => setBuckets(r.buckets)).catch(setBucketsError);
  }, []);
  useEffect(reloadBuckets, [reloadBuckets]);
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  async function logout() {
    try { await api.logout(); } catch { /* ignore */ }
    setOut(); nav('/'); snack('Signed out');
  }

  const link = ({ isActive }: { isActive: boolean }) =>
    `state-layer flex h-14 items-center gap-3 rounded-full px-4 text-sm font-medium ${isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'}`;

  const drawer = (
    <nav aria-label="Buckets" className="flex h-full flex-col gap-1 p-3">
      <h2 className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-on-surface-variant">Buckets</h2>
      {bucketsError ? <p className="px-4 text-sm text-error">Couldn’t load buckets.</p>
        : buckets === null ? [0, 1, 2].map((i) => <Skeleton key={i} className="mx-1 h-12 rounded-full" />)
        : buckets.map((b) => (
          <NavLink key={b.name} to={`/b/${encodeURIComponent(b.name)}/`} className={link}>
            <HardDrive className="h-5 w-5 shrink-0" aria-hidden /><span className="truncate">{b.name}</span>
          </NavLink>
        ))}
      {readOnly && <p className="mt-auto rounded-2xl bg-surface-container px-4 py-3 text-xs text-on-surface-variant">Read-only mode — deleting is turned off.</p>}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-1 bg-background/90 px-2 backdrop-blur sm:px-4">
        <IconButton label="Open navigation menu" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></IconButton>
        <Link to="/" className="state-layer ml-1 flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-[22px] text-on-surface">
          <FolderOpen className="h-7 w-7 text-primary" aria-hidden /> <span>R2 Explorer</span>
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
        <IconButton label="Sign out" onClick={logout}><LogOut className="h-5 w-5" /></IconButton>
      </header>
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-72 shrink-0 overflow-y-auto lg:block">{drawer}</aside>
        <main className="min-w-0 flex-1 px-3 pb-10 sm:px-4 lg:pr-6">
          <Outlet context={{ buckets, bucketsError, reloadBuckets } satisfies ShellCtx} />
        </main>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="anim-fade-in absolute inset-0 bg-[var(--m3-scrim)]" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto rounded-r-[28px] bg-surface-low shadow-e3">
            <div className="flex h-16 items-center justify-between px-4">
              <span className="text-lg">Navigate</span>
              <IconButton label="Close navigation menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></IconButton>
            </div>
            <div className="h-[calc(100%-4rem)]">{drawer}</div>
          </div>
        </div>
      )}
    </div>
  );
}
