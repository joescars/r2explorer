import { useEffect, useRef, useState } from 'react';
import { api, friendlyError } from '../api';
import { Button, ConfirmDialog, Dialog, LinearProgress, TextField } from '../ui';

export function DeleteFileDialog({ bucket, file, onClose, onDone, onError }: {
  bucket: string; file: { key: string; name: string } | null; onClose: () => void; onDone: (name: string) => void; onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const last = useRef(file); if (file) last.current = file;
  const f = last.current;
  return (
    <ConfirmDialog open={!!file} onClose={onClose} busy={busy} title="Delete this file?"
      message={<>“<strong className="font-medium text-on-surface">{f?.name}</strong>” will be permanently deleted from <strong className="font-medium text-on-surface">{bucket}</strong>. This can’t be undone.</>}
      confirmLabel="Delete file"
      onConfirm={async () => {
        if (!f) return; setBusy(true);
        try { await api.deleteObject(bucket, f.key); onDone(f.name); }
        catch (e) { onError(friendlyError(e).message); }
        finally { setBusy(false); onClose(); }
      }} />
  );
}

export function DeleteFolderDialog({ bucket, folder, onClose, onDone, onError }: {
  bucket: string; folder: { prefix: string; name: string } | null; onClose: () => void; onDone: (name: string, count: number) => void; onError: (m: string) => void;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTyped(''); }, [folder?.prefix]);
  if (!folder) return null;
  const ok = typed === folder.name;
  async function go() {
    if (!folder || !ok) return; setBusy(true);
    try { const r = await api.deletePrefix(bucket, folder.prefix); onDone(folder.name, r.deleted); }
    catch (e) { onError(friendlyError(e).message); }
    finally { setBusy(false); onClose(); }
  }
  return (
    <Dialog open onClose={onClose} dismissible={!busy} aria-busy={busy} initialFocusRef={inputRef} title="Delete this folder and everything in it?"
      footer={<>
        <Button variant="text" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="danger" disabled={!ok} loading={busy} onClick={go}>{busy ? 'Deleting…' : 'Delete folder'}</Button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); void go(); }}>
        <p className="text-sm leading-relaxed">
          Every file inside <strong className="font-medium text-on-surface">{folder.name}</strong> in <strong className="font-medium text-on-surface">{bucket}</strong>, including subfolders, will be permanently deleted. This can’t be undone.
        </p>
        <p className="mt-3 rounded-xl bg-surface-container px-3 py-2 font-mono text-xs text-on-surface">{folder.prefix}</p>
        <TextField className="mt-4" label={`Type “${folder.name}” to confirm`} value={typed} disabled={busy}
          onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} inputRef={inputRef} />
        {busy && <div className="mt-4"><LinearProgress /><p className="mt-2 text-xs">Deleting files… this can take a while for large folders.</p></div>}
      </form>
    </Dialog>
  );
}
