import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download, File as FileIcon, FileArchive, FileCode, FileImage, FileText, Folder, FolderOpen, HardDrive, Search, Trash2 } from 'lucide-react';
import { api, friendlyError } from '../api';
import type { FileItem, Folder as FolderT } from '../api';
import { formatBytes, formatDate, fileKind } from '../format';
import { useSession } from '../session';
import type { ShellCtx } from '../components/Shell';
import { ErrorState } from '../components/ErrorState';
import { DetailsSheet } from '../components/DetailsSheet';
import { DeleteFileDialog, DeleteFolderDialog } from '../components/DeleteDialogs';
import { Breadcrumbs, Button, EmptyState, IconButton, LinearProgress, SkeletonRows, useSnackbar } from '../ui';

type SortKey = 'name' | 'size' | 'modified';
const KIND_ICON = { image: FileImage, text: FileText, archive: FileArchive, code: FileCode, file: FileIcon };
const bucketPath = (b: string, prefix: string) => `/b/${encodeURIComponent(b)}/${prefix.split('/').filter(Boolean).map(encodeURIComponent).join('/')}${prefix ? '/' : ''}`;

export function Browser() {
  const params = useParams();
  const bucket = params.bucket!;
  const splat = params['*'] ?? '';
  const prefix = splat ? (splat.endsWith('/') ? splat : splat + '/') : '';
  const { readOnly } = useSession();
  const { buckets } = useOutletContext<ShellCtx>();
  const nav = useNavigate();
  const snack = useSnackbar();

  const [folders, setFolders] = useState<FolderT[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [next, setNext] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const [selected, setSelected] = useState<FileItem | null>(null);
  const [delFile, setDelFile] = useState<FileItem | null>(null);
  const [delFolder, setDelFolder] = useState<FolderT | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(null); setFolders([]); setFiles([]); setNext(undefined); setFilter(''); setSelected(null);
    api.list(bucket, prefix).then((r) => { if (!live) return; setFolders(r.folders); setFiles(r.files); setNext(r.nextToken); })
      .catch((e) => live && setError(e)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [bucket, prefix, tick]);

  async function loadMore() {
    if (!next) return; setMore(true);
    try {
      const r = await api.list(bucket, prefix, next);
      setFiles((f) => [...f, ...r.files]);
      setFolders((f) => [...f, ...r.folders.filter((x) => !f.some((y) => y.prefix === x.prefix))]);
      setNext(r.nextToken);
    } catch (e) { snack(friendlyError(e).message, { tone: 'error' }); } finally { setMore(false); }
  }

  const download = useCallback(async (f: FileItem) => {
    try { const { url } = await api.download(bucket, f.key); snack(`Downloading ${f.name}…`); window.location.assign(url); }
    catch (e) { snack(friendlyError(e).message, { tone: 'error' }); }
  }, [bucket, snack]);

  const q = filter.trim().toLowerCase();
  const { shownFolders, shownFiles } = useMemo(() => {
    const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) * sort.dir;
    const sf = folders.filter((f) => f.name.toLowerCase().includes(q))
      .sort((a, b) => (sort.key === 'name' ? cmp(a.name, b.name) : a.name.localeCompare(b.name)));
    const fl = files.filter((f) => f.name.toLowerCase().includes(q)).sort((a, b) =>
      sort.key === 'size' ? (a.size - b.size) * sort.dir
      : sort.key === 'modified' ? (+new Date(a.lastModified) - +new Date(b.lastModified)) * sort.dir
      : cmp(a.name, b.name));
    return { shownFolders: sf, shownFiles: fl };
  }, [folders, files, q, sort]);

  const crumbs = useMemo(() => {
    const parts = prefix.split('/').filter(Boolean);
    return [
      { label: 'Buckets', onClick: () => nav('/') },
      { label: bucket, icon: <HardDrive className="h-4 w-4" aria-hidden />, onClick: () => nav(bucketPath(bucket, '')) },
      ...parts.map((p, i) => ({ label: p, onClick: () => nav(bucketPath(bucket, parts.slice(0, i + 1).join('/'))) })),
    ];
  }, [bucket, prefix, nav]);

  const bucketMissing = buckets && !buckets.some((b) => b.name === bucket);
  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'name' ? 1 : -1 }));
  const SortHead = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <button type="button" onClick={() => toggle(k)} aria-label={`Sort by ${label}`}
      className={`state-layer inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${sort.key === k ? 'text-on-surface' : 'text-on-surface-variant'} ${className}`}>
      {label}{sort.key === k && (sort.dir === 1 ? <ArrowUp className="h-3.5 w-3.5" aria-label="ascending" /> : <ArrowDown className="h-3.5 w-3.5" aria-label="descending" />)}
    </button>
  );
  const grid = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_5.5rem]';
  const empty = !loading && !error && folders.length === 0 && files.length === 0;

  return (
    <div className={`mx-auto max-w-6xl pt-2 ${selected ? 'lg:mr-[24rem]' : ''}`}>
      <Breadcrumbs items={crumbs} renderLink={(c, cls, content) => <button type="button" onClick={c.onClick} className={cls}>{content}</button>} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Filter by name</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" aria-hidden />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name"
            className="h-12 w-full rounded-full bg-surface-container pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-high focus:outline-2 focus:outline-primary" />
        </label>
        {!loading && !error && <span className="text-sm text-on-surface-variant">{shownFolders.length} folders, {shownFiles.length} files{next ? ' so far' : ''}</span>}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant bg-surface">
        {loading && <LinearProgress />}
        <div className={`${grid} border-b border-outline-variant bg-surface-low px-3 py-1 sm:px-4`} role="row">
          <SortHead k="name" label="Name" className="justify-self-start" />
          <span className="hidden sm:block"><SortHead k="size" label="Size" className="-mr-2 ml-auto flex" /></span>
          <span className="hidden sm:block"><SortHead k="modified" label="Modified" /></span>
          <span className="sr-only sm:not-sr-only sm:text-right sm:text-xs sm:text-on-surface-variant">Actions</span>
        </div>
        {error ? <div className="p-4"><ErrorState error={error} onRetry={() => setTick(tick + 1)} /></div>
          : loading ? <div className="p-4"><SkeletonRows rows={6} /></div>
          : bucketMissing ? <div className="p-4"><EmptyState title="Bucket not found" description="This bucket isn’t available in this app." action={<Button variant="tonal" onClick={() => nav('/')}>Back to buckets</Button>} /></div>
          : empty ? <div className="p-4"><EmptyState icon={FolderOpen} title="This folder is empty" description="There are no files here yet." /></div>
          : shownFolders.length + shownFiles.length === 0 ? <div className="p-4"><EmptyState icon={Search} title={`No matches for “${filter}”`} description={next ? 'More files haven’t been loaded yet — load more to search them too.' : undefined} action={<Button variant="tonal" onClick={() => setFilter('')}>Clear filter</Button>} /></div>
          : (
            <ul>
              {shownFolders.map((f) => (
                <li key={f.prefix} className={`${grid} group border-b border-outline-variant/60 px-3 last:border-0 sm:px-4`}>
                  <Link to={bucketPath(bucket, f.prefix)} className="state-layer -mx-1 flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-1 py-2 sm:col-span-3 sm:grid sm:grid-cols-subgrid">
                    <span className="flex min-w-0 items-center gap-3"><Folder className="h-6 w-6 shrink-0 text-primary" fill="currentColor" fillOpacity={0.2} aria-hidden /><span className="truncate text-sm font-medium">{f.name}</span></span>
                    <span className="hidden text-sm text-on-surface-variant sm:block text-right">—</span><span className="hidden text-sm text-on-surface-variant sm:block">—</span>
                  </Link>
                  <div className="flex justify-end">
                    {!readOnly && <IconButton label={`Delete folder ${f.name}`} size="sm" onClick={() => setDelFolder(f)}><Trash2 className="h-[18px] w-[18px]" /></IconButton>}
                  </div>
                </li>
              ))}
              {shownFiles.map((f) => {
                const Icon = KIND_ICON[fileKind(f.name)];
                const sel = selected?.key === f.key;
                return (
                  <li key={f.key} className={`${grid} border-b border-outline-variant/60 px-3 last:border-0 sm:px-4 ${sel ? 'bg-secondary-container/60' : ''}`}>
                    <button type="button" onClick={() => setSelected(f)} aria-pressed={sel} aria-label={`${f.name}, show details`}
                      className="state-layer -mx-1 flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-1 py-2 text-left sm:col-span-3 sm:grid sm:grid-cols-subgrid">
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon className="h-6 w-6 shrink-0 text-on-surface-variant" aria-hidden />
                        <span className="min-w-0"><span className="block truncate text-sm">{f.name}</span>
                          <span className="block text-xs text-on-surface-variant sm:hidden">{formatBytes(f.size)} · {formatDate(f.lastModified)}</span></span>
                      </span>
                      <span className="hidden text-right text-sm text-on-surface-variant sm:block">{formatBytes(f.size)}</span>
                      <span className="hidden text-sm text-on-surface-variant sm:block">{formatDate(f.lastModified)}</span>
                    </button>
                    <div className="flex justify-end">
                      <IconButton label={`Download ${f.name}`} size="sm" onClick={() => download(f)}><Download className="h-[18px] w-[18px]" /></IconButton>
                      {!readOnly && <IconButton label={`Delete ${f.name}`} size="sm" className="hidden sm:inline-flex" onClick={() => setDelFile(f)}><Trash2 className="h-[18px] w-[18px]" /></IconButton>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
      {next && !loading && (
        <div className="mt-4 flex justify-center"><Button variant="tonal" loading={more} onClick={loadMore}>Load more</Button></div>
      )}

      {selected && <DetailsSheet bucket={bucket} file={selected} readOnly={readOnly} onClose={() => setSelected(null)} onDownload={download} onDelete={setDelFile} />}
      <DeleteFileDialog bucket={bucket} file={delFile} onClose={() => setDelFile(null)}
        onDone={(n) => { snack(`Deleted ${n}`); setSelected(null); setTick((t) => t + 1); }} onError={(m) => snack(m, { tone: 'error' })} />
      <DeleteFolderDialog bucket={bucket} folder={delFolder} onClose={() => setDelFolder(null)}
        onDone={(n, c) => { snack(`Deleted folder ${n} (${c.toLocaleString()} ${c === 1 ? 'file' : 'files'})`); setTick((t) => t + 1); }} onError={(m) => snack(m, { tone: 'error' })} />
    </div>
  );
}
