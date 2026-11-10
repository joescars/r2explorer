import { useState } from 'react';
import type { FormEvent } from 'react';
import { FolderOpen } from 'lucide-react';
import { api, friendlyError } from '../api';
import { useSession } from '../session';
import { Button, TextField } from '../ui';

export function Login() {
  const { setIn } = useSession();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await api.login(pw); setIn(); }
    catch (x) {
      const f = friendlyError(x);
      setErr(f.kind === 'unauthorized' ? 'That password isn’t right. Try again.' : f.kind === 'network' ? f.message : f.message);
    } finally { setBusy(false); }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-[26rem] rounded-[28px] border border-outline-variant bg-surface p-8 sm:p-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-container text-on-primary-container"><FolderOpen className="h-7 w-7" aria-hidden /></span>
          <h1 className="text-2xl font-normal">Sign in</h1>
          <p className="mt-1 text-sm text-on-surface-variant">to continue to R2 Explorer</p>
        </div>
        <TextField label="Password" type="password" autoComplete="current-password" autoFocus value={pw}
          onChange={(e) => setPw(e.target.value)} errorText={err} required />
        <div className="mt-8 flex justify-end">
          <Button type="submit" loading={busy} disabled={!pw}>Sign in</Button>
        </div>
      </form>
    </main>
  );
}
