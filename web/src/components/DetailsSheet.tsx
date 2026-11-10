import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Trash2, X } from 'lucide-react';
import { api } from '../api';
import type { FileItem, ObjectDetails } from '../api';
import { formatBytes, formatDate } from '../format';
import { ErrorState } from './ErrorState';
import { Button, IconButton, Skeleton, useSnackbar } from '../ui';

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="py-3">
      <dt className="text-xs font-medium text-on-surface-variant">{label}</dt>
      <dd className={`mt-0.5 break-all text-sm ${mono ? 'font-mono text-[13px]' : ''}`}>{children}</dd>
    </div>
  );
}

export function DetailsSheet({ bucket, file, readOnly, onClose, onDownload, onDelete }: {
  bucket: string; file: FileItem; readOnly: boolean; onClose: () => void; onDownload: (f: FileItem) => void; onDelete: (f: FileItem) => void;
}) {
  const [d, setD] = useState<ObjectDetails | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [n, setN] = useState(0);
  const snack = useSnackbar();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let live = true; setD(null); setErr(null);
    api.details(bucket, file.key).then((r) => live && setD(r)).catch((e) => live && setErr(e));
    return () => { live = false; };
  }, [bucket, file.key, n]);
  useEffect(() => { closeRef.current?.focus(); }, [file.key]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  async function copy() {
    try { await navigator.clipboard.writeText(file.key); snack('Path copied to clipboard'); }
    catch { snack('Couldn’t copy — select the path and copy it manually', { tone: 'error' }); }
  }
  const meta = d ? Object.entries(d.metadata ?? {}) : [];
  return (
    <>
      <div className="anim-fade-in fixed inset-0 z-40 bg-[var(--m3-scrim)] lg:hidden" onClick={onClose} aria-hidden />
      <aside aria-label={`Details for ${file.name}`}
        className="anim-slide-up fixed inset-y-0 right-0 z-40 flex w-full max-w-[24rem] flex-col rounded-l-[28px] bg-surface-low shadow-e3 lg:top-16 lg:rounded-t-[28px] lg:rounded-b-none lg:shadow-e2">
        <div className="flex items-start gap-2 p-4 pb-2">
          <h2 className="min-w-0 flex-1 break-words pt-1.5 text-lg font-medium leading-snug">{file.name}</h2>
          <IconButton ref={closeRef} label="Close details" onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </div>
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          <Button size="sm" icon={<Download className="h-4 w-4" />} onClick={() => onDownload(file)}>Download</Button>
          <Button size="sm" variant="tonal" icon={<Copy className="h-4 w-4" />} onClick={copy}>Copy path</Button>
          {!readOnly && <Button size="sm" variant="danger-tonal" icon={<Trash2 className="h-4 w-4" />} onClick={() => onDelete(file)}>Delete</Button>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {err ? <ErrorState error={err} onRetry={() => setN(n + 1)} /> : (
            <dl className="divide-y divide-outline-variant">
              <Row label="Full path" mono>{file.key}</Row>
              <Row label="Size">{d ? `${formatBytes(d.size)} (${d.size.toLocaleString()} bytes)` : <Skeleton className="h-4 w-32" />}</Row>
              <Row label="File type">{d ? d.contentType || 'Unknown' : <Skeleton className="h-4 w-40" />}</Row>
              <Row label="Last modified">{d ? formatDate(d.lastModified, true) : <Skeleton className="h-4 w-44" />}</Row>
              <Row label="ETag" mono>{d ? d.etag : <Skeleton className="h-4 w-52" />}</Row>
              <Row label="Storage class">{d ? d.storageClass || 'Standard' : <Skeleton className="h-4 w-24" />}</Row>
              <Row label="Custom metadata">
                {!d ? <Skeleton className="h-4 w-28" /> : meta.length === 0 ? <span className="text-on-surface-variant">None</span> : (
                  <ul className="space-y-1">{meta.map(([k, v]) => <li key={k}><span className="text-on-surface-variant">{k}:</span> {v}</li>)}</ul>
                )}
              </Row>
            </dl>
          )}
        </div>
      </aside>
    </>
  );
}
