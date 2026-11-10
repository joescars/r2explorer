import { useOutletContext, Link } from 'react-router-dom';
import { HardDrive, PackageOpen } from 'lucide-react';
import type { ShellCtx } from '../components/Shell';
import { ErrorState } from '../components/ErrorState';
import { formatDate } from '../format';
import { EmptyState, PageHeader, Skeleton } from '../ui';

export function Buckets() {
  const { buckets, bucketsError, reloadBuckets } = useOutletContext<ShellCtx>();
  return (
    <div className="mx-auto max-w-5xl pt-2">
      <PageHeader title="Your buckets" description="Choose a bucket to browse its files." />
      {bucketsError ? <ErrorState error={bucketsError} onRetry={reloadBuckets} />
        : buckets === null ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : buckets.length === 0 ? (
          <EmptyState icon={PackageOpen} title="No buckets to show" description="This account has no R2 buckets, or none are allowed for this app. Create one in the Cloudflare dashboard, or check the R2_BUCKETS setting." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buckets.map((b) => (
              <li key={b.name}>
                <Link to={`/b/${encodeURIComponent(b.name)}/`} className="state-layer flex h-full flex-col gap-4 rounded-2xl bg-surface-container p-5 text-on-surface">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-container text-on-primary-container"><HardDrive className="h-6 w-6" aria-hidden /></span>
                  <span>
                    <span className="block truncate text-lg">{b.name}</span>
                    <span className="block text-sm text-on-surface-variant">{b.creationDate ? `Created ${formatDate(b.creationDate)}` : 'R2 bucket'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
