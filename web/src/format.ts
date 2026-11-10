export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}
export function formatDate(iso?: string, long = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(+d)) return '—';
  return d.toLocaleString(undefined, long
    ? { dateStyle: 'long', timeStyle: 'short' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
}
export function fileKind(name: string, type?: string): 'image' | 'text' | 'archive' | 'code' | 'file' {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['gz', 'zip', 'tar', '7z', 'rar'].includes(ext)) return 'archive';
  if (['js', 'ts', 'css', 'html', 'json', 'md'].includes(ext)) return 'code';
  if (['txt', 'pdf', 'doc', 'docx'].includes(ext) || type?.startsWith('text/')) return 'text';
  return 'file';
}
