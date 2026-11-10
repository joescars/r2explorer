import type { ReactNode } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock3, CircleDashed, Disc, Info, Loader2, MinusCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-highest text-on-surface-variant',
  primary: 'bg-primary-container text-on-primary-container',
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  error: 'bg-error-container text-on-error-container',
  info: 'bg-info-container text-on-info-container',
};

export function Chip({ tone = 'neutral', icon, children, className = '' }: {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  const Icon = icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}

const STATUS_META: Record<string, { tone: Tone; icon: LucideIcon; label: string }> = {
  queued: { tone: 'neutral', icon: Clock3, label: 'Queued' },
  running: { tone: 'info', icon: Disc, label: 'Running' },
  succeeded: { tone: 'success', icon: CheckCircle2, label: 'Succeeded' },
  completed: { tone: 'success', icon: CheckCircle2, label: 'Completed' },
  failed: { tone: 'error', icon: AlertTriangle, label: 'Failed' },
  cancelled: { tone: 'neutral', icon: MinusCircle, label: 'Cancelled' },
  pending: { tone: 'warning', icon: Clock3, label: 'Pending' },
  approved: { tone: 'success', icon: CheckCircle2, label: 'Approved' },
  denied: { tone: 'error', icon: MinusCircle, label: 'Denied' },
  seen: { tone: 'info', icon: Info, label: 'Seen' },
  unknown: { tone: 'neutral', icon: CircleDashed, label: 'Unknown' },
};

export function StatusChip({ status, label, pulse }: { status: string; label?: string; pulse?: boolean }) {
  const meta = STATUS_META[status] ?? { tone: 'neutral' as Tone, icon: CircleDashed, label: status };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[meta.tone]}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${pulse ? 'anim-spin' : ''}`} aria-hidden />
      {label ?? meta.label}
    </span>
  );
}

export function Dot({ tone = 'success', pulse = false }: { tone?: Tone; pulse?: boolean }) {
  const bg: Record<Tone, string> = {
    neutral: 'bg-outline', primary: 'bg-primary', success: 'bg-success',
    warning: 'bg-warning', error: 'bg-error', info: 'bg-info',
  };
  return (
    <span className="relative inline-flex h-2.5 w-2.5" aria-hidden>
      {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${bg[tone]}`} />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${bg[tone]}`} />
    </span>
  );
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function SkeletonRows({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function LinearProgress({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-1 w-full overflow-hidden rounded-full bg-primary-container ${className}`} role="progressbar" aria-label="Loading">
      <span className="absolute inset-y-0 w-1/3 rounded-full bg-primary [animation:rt-indeterminate_1.6s_ease-in-out_infinite]" />
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`anim-spin text-primary ${className}`} aria-label="Loading" />;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl bg-surface-container px-6 py-12 text-center ${className}`}>
      {Icon && <Icon className="mb-1 h-10 w-10 text-on-surface-variant/60" aria-hidden />}
      <h3 className="text-base font-medium">{title}</h3>
      {description && <p className="max-w-md text-sm text-on-surface-variant">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
